import os
import subprocess

if __name__ == '__main__':
    if not os.path.isfile('/gpu_model.buf'):
        engine = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'engine.py')
        subprocess.run(['python3', '-u', engine,
                        '-i', '/gpu_model.uff',
                        '-o', '/gpu_model.buf',
                        '-p', os.getenv('TRT_FLOAT_PRECISION', '32')
                        ], check=True)

    from detect_objects import main as detect_objects_main
    detect_objects_main()
