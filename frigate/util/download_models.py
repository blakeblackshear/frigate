
import os
import hashlib
import logging

logger = logging.getLogger(__name__)

def execute(cmd):
    logger.info(f'executing: {cmd}')
    ret = os.system(cmd)
    if ret != 0:
        logger.error(f'command {cmd} returned exit code: {ret}')
    return ret

def file_digest(filename):
    with open(filename, mode='rb') as f:
        d = hashlib.sha256()
        while True:
            buf = f.read(131072)
            if not buf:
                break
            d.update(buf)
        return d.hexdigest()

def download_yolov8():
    url = 'https://github.com/harakas/models/releases/download/yolov8.1-1.0/yolov8.small.models.tar.gz'
    target_dir = '/config/model_cache/yolov8'
    download_name = 'download.tar.gz'
    allowed_hashes = set(('3407d38e44163e84f197827d5fc61b31f0e3dd82de90a15838e7faf9a18f6278',))
    if os.path.exists(f'{target_dir}/model.fetched'):
        logger.info(f"{target_dir}/model.fetched present, nothing to do")
        return
    os.makedirs(target_dir, exist_ok=True)
    os.chdir(target_dir)
    ret = execute(f'curl --silent -L --max-filesize 500M --insecure --output {target_dir}/{download_name} {url}')
    if ret != 0:
        try:
            os.unlink(download_name)
        except:
            pass
        return
    digest = file_digest(download_name)
    if digest not in allowed_hashes:
        logger.info(f"Downloaded yolov8 model file not in allowed hashes: {digest}")
        os.unlink(download_name)
        return
    ret = execute(f'tar zxf {download_name}')
    if ret != 0:
        os.unlink(download_name)
        return
    logger.info(f"Download and and extraction complete, marking download as done")
    open('model.fetched', 'w').close()
    os.unlink(download_name)


if __name__ == '__main__':
    if os.getenv('DOWNLOAD_YOLOV8') in ('1', 'TRUE'):
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__file__)
        logger.info(f"DOWNLOAD_YOLOV8={os.getenv('DOWNLOAD_YOLOV8')} -- running yolov8 download")
        download_yolov8()

