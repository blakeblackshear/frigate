import requests


def convertMicroToMilliSeconds(microseconds):
    if microseconds is not None:
        return microseconds / 1000
    return 0


class CustomResponse:
    def __init__(self, url, response_ms, up_or_down):
        self.url = url
        self.response_ms = response_ms
        self.up_or_down = up_or_down

    def __str__(self):
        return f"{self.url}:\nstatus -> {self.up_or_down}\nresponse_ms -> {self.response_ms}\n"


class Requester:
    def __init__(self, url):
        self.url = url

    def get_request(self):
        res = requests.get(self.url)
        if res is not None:
            upDown = 0
            if res.status_code == 200:
                upDown = 1
            milliseconds = convertMicroToMilliSeconds(res.elapsed.microseconds)
            return CustomResponse(self.url, milliseconds, upDown)
        else:
            # The request did not return anything
            return CustomResponse(self.url, 0, 0)