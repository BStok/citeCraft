from flask import Flask, request, jsonify
from backend.acquisition.paper_acquisition import get_papers  # Assuming you wrap your CLI logic
from backend.comparison.comp import compare_papers  # Same here


app = Flask(__name__)

@app.route("/search_papers", methods=["POST"])
def search_papers():
    data = request.json
    query = data.get("query")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    try:
        # This should return a list/dict representing CSV rows
        results = get_papers(query)
        return jsonify({"papers": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/compare_papers", methods=["POST"])
def compare():
    data = request.json
    folder_path = data.get("folder_path")
    if not folder_path:
        return jsonify({"error": "No folder path provided"}), 400

    try:
        # This should return structured comparison results
        comparison = compare_papers(folder_path)
        return jsonify({"comparison": comparison})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)