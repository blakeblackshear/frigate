# adapted from https://medium.com/@jonathonbao/python3-logging-with-multiprocessing-f51f460b8778
import logging
import threading
from logging import handlers

def listener_configurer():
    root = logging.getLogger()
    console_handler = logging.StreamHandler()
    formatter = logging.Formatter('%(threadName)-25s %(name)-16s %(levelname)-8s: %(message)s')
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)
    root.setLevel(logging.INFO)

def root_configurer(queue):
    h = handlers.QueueHandler(queue)
    root = logging.getLogger()
    root.addHandler(h)
    root.setLevel(logging.INFO)

def log_process(queue):
    threading.current_thread().name = f"logger"
    listener_configurer()
    while True:
        record = queue.get()
        logger = logging.getLogger(record.name)
        logger.handle(record)
