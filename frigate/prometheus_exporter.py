from prometheus_client import CollectorRegistry
from prometheus_client.metrics_core import GaugeMetricFamily
from util.requester import Requester


def setupRegistry():
    myregistry = CollectorRegistry()
    myregistry.register(CustomCollector())
    return myregistry


class CustomCollector():
    def __init__(self):
        self.service_unavailable_url = "https://httpstat.us/503"
        self.ok_url = "https://httpstat.us/200"

    def collect(self):
        server_unavailable_requester = Requester(self.service_unavailable_url)
        ok_requester = Requester(self.ok_url)

        server_unavailable_response = server_unavailable_requester.get_request()
        ok_response = ok_requester.get_request()

        url_up_gauge = GaugeMetricFamily('sample_external_url_up', 'Help text', labels=['url'])
        url_response_ms_gauge = GaugeMetricFamily('sample_external_url_response_ms', 'Help text', labels=['url'])

        url_up_gauge.add_metric([server_unavailable_response.url], server_unavailable_response.up_or_down)
        url_response_ms_gauge.add_metric([server_unavailable_response.url], server_unavailable_response.response_ms)

        url_up_gauge.add_metric([ok_response.url], ok_response.up_or_down)
        url_response_ms_gauge.add_metric([ok_response.url], ok_response.response_ms)

        yield url_up_gauge
        yield url_response_ms_gauge