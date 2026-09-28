FROM python:3.13-slim
WORKDIR /app
COPY dahua_tools/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY dahua_tools /app/dahua_tools
COPY frigate/__init__.py frigate/dahua_adapter.py /app/frigate/
ENV PYTHONPATH=/app
CMD ["python", "-m", "dahua_tools.simulator"]
