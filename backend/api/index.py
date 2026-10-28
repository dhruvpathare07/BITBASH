"""Vercel entry point: exposes the Flask app as a serverless function.

Deploy the backend/ folder as its own Vercel project; vercel.json routes
every path here. Locally, keep using `python app.py`.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: E402,F401
