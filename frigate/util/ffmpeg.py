import subprocess as sp

from frigate.log import LogPipe


def stop_ffmpeg(ffmpeg_process, logger):
    logger.info("Terminating the existing ffmpeg process...")
    ffmpeg_process.terminate()
    try:
        logger.info("Waiting for ffmpeg to exit gracefully...")
        ffmpeg_process.communicate(timeout=30)
    except sp.TimeoutExpired:
        logger.info("FFmpeg didn't exit. Force killing...")
        ffmpeg_process.kill()
        ffmpeg_process.communicate()
    ffmpeg_process = None


def start_or_restart_ffmpeg(
    ffmpeg_cmd, logger, logpipe: LogPipe, frame_size=None, ffmpeg_process=None
):
    if ffmpeg_process is not None:
        stop_ffmpeg(ffmpeg_process, logger)

    if frame_size is None:
        process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.DEVNULL,
            stderr=logpipe,
            stdin=sp.DEVNULL,
            start_new_session=True,
        )
    else:
        process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.PIPE,
            stderr=logpipe,
            stdin=sp.DEVNULL,
            bufsize=frame_size * 10,
            start_new_session=True,
        )
    return process
