import json
from urllib.request import urlopen
from prometheus_client import CollectorRegistry
from prometheus_client.metrics_core import GaugeMetricFamily
from requester import Requester


def setupRegistry():
    myregistry = CollectorRegistry()
    myregistry.register(CustomCollector())
    return myregistry


class CustomCollector():
    def __init__(self):
        self.stats_url = "http://localhost:5000/api/stats"


    def collect(self):


        data = json.loads(urlopen(self.url).read())

        for k, d in data.items():
            print("".format(k, d))


       