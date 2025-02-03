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

@app.route('/api/models/health', methods=['POST'])
def check_model_health():
    """Check if specific models are available and healthy"""
    try:
        data = request.json
        model_ids = data.get('modelIds', [])
        
        is_available, models_data = check_lm_studio()
        if not is_available:
            return jsonify({
                "status": "offline",
                "message": "LM Studio is not available",
                "models": {}
            }), 503
            
        available_models = {
            model["id"]: {
                "available": True,
                "name": model.get("name", model["id"])
            }
            for model in models_data.get("data", [])
        }
        
        # Check status for requested models
        model_status = {}
        for model_id in model_ids:
            model_status[model_id] = {
                "available": model_id in available_models,
                "name": available_models.get(model_id, {}).get("name", model_id),
                "status": "ready" if model_id in available_models else "unavailable"
            }
            
        return jsonify({
            "status": "online",
            "message": "Model health check completed",
            "models": model_status
        })
    except Exception as e:
        error_message = f"Model Health Check Error: {str(e)}"
        print(error_message)
        return jsonify({
            "status": "error",
            "message": error_message,
            "models": {}
        }), 500

def process_with_assistant(message, model_id="default", panel_id=None, config=None):
    """Process a message with a specific assistant using the LM Studio API"""
    try:
        # Validate model availability
        is_available, models_data = check_lm_studio()
        if not is_available:
            raise Exception("LM Studio is not available")
            
        # Get available models
        available_models = {
            model["id"]: model 
            for model in models_data.get("data", [])
        }
        
        # Validate model availability
        if model_id not in available_models:
            fallback_model = next(iter(available_models.values()))["id"] if available_models else None
            if not fallback_model:
                raise Exception(f"Model {model_id} is not available and no fallback models found")
            print(f"Model {model_id} not available, falling back to {fallback_model}")
            model_id = fallback_model
            
        # Apply configuration with defaults
        default_config = {
            "temperature": 0.7,
            "max_tokens": 2000,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0
        }
        
        if config:
            default_config.update(config)
        
        payload = {
            "model": model_id,
            "messages": [{"role": "user", "content": message}],
            **default_config,
            "stream": False
        }
        
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "panel_id": panel_id,
                "model_id": model_id,
                "config": default_config,
                "thought_process": f"Processing message with model: {model_id}",
                "response": result['choices'][0]['message']['content'],
                "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
            }
        else:
            raise Exception(f"LM Studio Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error in process_with_assistant: {str(e)}")
        raise

@app.route('/api/brainstorm/process', methods=['POST'])
def brainstorm_process():
    try:
        data = request.json
        panel_id = data.get('panelId')
        message = data.get('message')
        model_id = data.get('model')
        config = data.get('config')  # Optional configuration
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
            
        if not panel_id:
            return jsonify({"error": "Panel ID is required"}), 400
            
        # Process the message with the assistant
        result = process_with_assistant(message, model_id, panel_id, config)
        
        return jsonify(result)
    except Exception as e:
        error_message = f"Brainstorm Processing Error: {str(e)}"
        print(error_message)
        return jsonify({
            "error": error_message,
            "panel_id": panel_id,
            "model_id": model_id
        }), 500

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000) 