# adapted from https://medium.com/@jonathonbao/python3-logging-with-multiprocessing-f51f460b8778
import logging
import threading
import signal
import queue
import multiprocessing as mp
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

def log_process(log_queue):
    stop_event = mp.Event()
    def receiveSignal(signalNumber, frame):
        stop_event.set()
    
    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"logger"
    listener_configurer()
    while True:
        if stop_event.is_set() and log_queue.empty():
            break
        try:
            record = log_queue.get(timeout=5)
        except queue.Empty:
            continue
        logger = logging.getLogger(record.name)
        logger.handle(record)
