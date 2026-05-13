from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from groq import Groq
from PyPDF2 import PdfReader
import os
import base64

# Load .env
load_dotenv()

app = Flask(__name__)

# API Key
client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

chat_history = []


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():

    user_message = request.json.get("message")

    try:
        system_prompt = {
            "role": "system",
            "content": (
                "Kamu adalah Animous AI, asisten virtual pintar yang membantu pengguna dengan jawaban yang jelas, singkat, modern, dan profesional."
            )
        }

        chat_history.append({
            "role": "user",
            "content": user_message
        })

        messages = [system_prompt] + chat_history

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages
        )

        ai_response = response.choices[0].message.content

        chat_history.append({
            "role": "assistant",
            "content": ai_response
        })

        return jsonify({
            "response": ai_response
        })

    except Exception as e:
        return jsonify({
            "response": f"Terjadi error: {str(e)}"
        })
    
@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files.get("file")
    user_message = request.form.get(
        "message",
        "Jelaskan isi file ini secara singkat."
    )

    if not file:
        return jsonify({
            "response": "Tidak ada file yang dikirim."
        })

    try:
        filename = file.filename.lower()
        file_text = ""

        if filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
            image_bytes = file.read()
            image_base64 = base64.b64encode(image_bytes).decode("utf-8")

            image_type = "jpeg"
            if filename.endswith(".png"):
                image_type = "png"
            elif filename.endswith(".webp"):
                image_type = "webp"

            response = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": user_message
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/{image_type};base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ]
            )

            ai_response = response.choices[0].message.content

            return jsonify({
                "response": ai_response
            })

        elif filename.endswith(".pdf"):
            reader = PdfReader(file)

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    file_text += text + "\n"

        elif filename.endswith(".txt"):
            file_text = file.read().decode("utf-8")

        else:
            return jsonify({
                "response": "Format file belum didukung. Gunakan PDF, TXT, JPG, PNG, atau WEBP."
            })

        if not file_text.strip():
            return jsonify({
                "response": "File berhasil dibuka, tapi teksnya tidak terbaca."
            })

        prompt = f"""
        Baca isi file berikut dan bantu user memahami isinya.
        Jawab sesuai permintaan user.

        Permintaan user:
        {user_message}

        Isi file:
        {file_text[:6000]}
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "Kamu adalah Animous AI, asisten yang membantu membaca dan merangkum dokumen."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        ai_response = response.choices[0].message.content

        return jsonify({
            "response": ai_response
        })

    except Exception as e:
        return jsonify({
            "response": f"Terjadi error saat membaca file: {str(e)}"
        })


if __name__ == "__main__":
    app.run(debug=True)