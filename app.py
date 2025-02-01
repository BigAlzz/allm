from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from flask_socketio import SocketIO
import requests
import json
import time

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

BASE_URL = "http://192.168.50.89:1234/v1"

def check_lm_studio():
    try:
        response = requests.get(f"{BASE_URL}/models")
        if response.status_code == 200:
            return True, response.json()
        return False, None
    except Exception as e:
        print(f"Error checking LM Studio: {str(e)}")
        return False, None

@app.route('/api/models')
def get_models():
    is_available, models_data = check_lm_studio()
    if is_available and models_data:
        available_models = [
            {
                "id": model["id"],
                "name": model.get("name", model["id"]),
            }
            for model in models_data.get("data", [])
        ]
        return jsonify({
            "status": "online",
            "models": available_models
        })
    return jsonify({
        "status": "offline",
        "models": []
    })

@app.route('/api/check-server')
def check_server():
    is_available, _ = check_lm_studio()
    return jsonify({"status": "online" if is_available else "offline"})

def stream_response(response):
    # Send initial thinking state
    yield f"data: {json.dumps({'status': 'thinking'})}\n\n"
    time.sleep(0.5)  # Brief delay to show thinking state

    first_token = True
    for line in response.iter_lines():
        if line:
            try:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    line = line[6:]  # Remove 'data: ' prefix
                    if line.strip() == '[DONE]':
                        break

                    json_data = json.loads(line)
                    if first_token:
                        # Send start message
                        yield f"data: {json.dumps({'status': 'streaming'})}\n\n"
                        first_token = False

                    chunk = json_data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                    if chunk:
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON: {e}")
            except Exception as e:
                print(f"Error processing stream: {e}")

    # Send completion message
    yield f"data: {json.dumps({'status': 'done'})}\n\n"

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        chat_id = data.get('chatId')
        messages = data.get('messages', [])
        model_id = data.get('model', 'default')
        
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2000,
            "stream": True
        }
        
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True
        )
        
        if response.status_code == 200:
            return Response(
                stream_with_context(stream_response(response)),
                content_type='text/event-stream'
            )
        else:
            error_message = f"LM Studio Error: {response.status_code} - {response.text}"
            print(error_message)
            return jsonify({"error": error_message}), 500
    except Exception as e:
        error_message = f"Server Error: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000) 