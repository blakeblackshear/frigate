import logging
import socket

from zeroconf import (
    ServiceInfo,
    NonUniqueNameException,
    InterfaceChoice,
    IPVersion,
    Zeroconf,
)

logger = logging.getLogger(__name__)

ZEROCONF_TYPE = "_frigate._tcp.local."

# Taken from: http://stackoverflow.com/a/11735897
def get_local_ip() -> str:
    """Try to determine the local IP address of the machine."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

        # Use Google Public DNS server to determine own IP
        sock.connect(("8.8.8.8", 80))

        return sock.getsockname()[0]  # type: ignore
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except socket.gaierror:
            return "127.0.0.1"
    finally:
        sock.close()


def broadcast_zeroconf(frigate_id):
    zeroconf = Zeroconf(interfaces=InterfaceChoice.Default, ip_version=IPVersion.V4Only)

    host_ip = get_local_ip()

    try:
        host_ip_pton = socket.inet_pton(socket.AF_INET, host_ip)
    except OSError:
        host_ip_pton = socket.inet_pton(socket.AF_INET6, host_ip)

    info = ServiceInfo(
        ZEROCONF_TYPE,
        name=f"{frigate_id}.{ZEROCONF_TYPE}",
        addresses=[host_ip_pton],
        port=5000,
    )

    logger.info("Starting Zeroconf broadcast")
    try:
        zeroconf.register_service(info)
    except NonUniqueNameException:
        logger.error(
            "Frigate instance with identical name present in the local network"
        )
    return zeroconf