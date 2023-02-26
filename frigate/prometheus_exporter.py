from typing import Dict
import json
import re
import time
import random
from os import path
from urllib.request import urlopen
import yaml
from prometheus_client.core import GaugeMetricFamily, REGISTRY, CounterMetricFamily


def add_metric(metric, label, data, key, multiplier=1.0):
    try:
        string = str(data[key])
        value = float(re.findall(r'\d+', string)[0])
        metric.add_metric([label], value * multiplier)
    except (KeyError, TypeError, IndexError):
        pass

class FrigateCollector(object):

    def __init__ (self, metricsobject, dataobject):
        self.metricsobject = metricsobject
        self.dataobject = dataobject



    def collect(self):


class PromMetricsClass:

    def __init__(self):
        self.metrics = dict()

class PromDataClass:

    def __init__(self):
        self.values_in = dict()
        self.values_out = dict()
