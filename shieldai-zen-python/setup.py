from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="shieldai-zen",
    version="1.0.0",
    author="ShieldAI Security",
    author_email="security@shieldai.dev",
    description="ShieldAI Zen Firewall — In-app runtime protection for Python (FastAPI, Django, Flask, Starlette). Blocks SQLi, XSS, path traversal, command injection, SSRF.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/shieldai/zen-python",
    project_urls={
        "Homepage": "https://shieldai.dev",
        "Bug Reports": "https://github.com/shieldai/zen-python/issues",
        "Source": "https://github.com/shieldai/zen-python",
        "Documentation": "https://docs.shieldai.dev/zen",
    },
    packages=find_packages(exclude=["tests*"]),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: Security",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Middleware",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3 :: Only",
    ],
    python_requires=">=3.8",
    install_requires=[],
    extras_require={
        "fastapi": ["starlette>=0.20.0"],
        "django": ["django>=3.2"],
        "flask": ["flask>=2.0"],
    },
    keywords="security firewall waf middleware sqli xss rasp runtime-protection shieldai",
)
