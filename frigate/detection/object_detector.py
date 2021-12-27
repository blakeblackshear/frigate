from abc import ABC, abstractmethod


class ObjectDetector(ABC):
    @abstractmethod
    def detect(self, tensor_input, threshold=0.4):
        pass
