import numpy as np
from frigate.sort import Sort


class ObjectTracker():
    def __init__(self, min_hits, max_age, iou_threshold):
        self.tracked_objects = {}
        self.disappeared = {}
        self.max_age = max_age
        self.mot_tracker = Sort(min_hits=min_hits, max_age=self.max_age, iou_threshold=iou_threshold)

    def register(self, id, obj):
        obj['id'] = id
        obj['start_time'] = obj['frame_time']
        obj['top_score'] = obj['score']
        self.add_history(obj)
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0

    def deregister(self, id):
        del self.tracked_objects[id]
        del self.disappeared[id]

    def update(self, id, new_obj):
        self.disappeared[id] = 0
        self.tracked_objects[id].update(new_obj)
        self.add_history(self.tracked_objects[id])
        if self.tracked_objects[id]['score'] > self.tracked_objects[id]['top_score']:
            self.tracked_objects[id]['top_score'] = self.tracked_objects[id]['score']

    def add_history(self, obj):
        entry = {
            'score': obj['score'],
            'box': obj['box'],
            'region': obj['region'],
            'centroid': obj['centroid'],
            'frame_time': obj['frame_time']
        }
        if 'history' in obj:
            obj['history'].append(entry)
            # only maintain the last 20 in history
            if len(obj['history']) > 20:
                obj['history'] = obj['history'][-20:]
        else:
            obj['history'] = [entry]

    def match_and_update(self, frame_time, new_objects):
        a = []
        for i, obj in enumerate(new_objects):
            a.append(list(obj[2]) + [obj[1], i])

        new_tracked_ids = {}
        if len(a) == 0:
            self.mot_tracker.update()
        else:
            new_tracked = self.mot_tracker.update(np.array(a))
            for t in new_tracked:
                # Convert from numpy float array to list of ints.
                int_arr = t.astype(np.int).tolist()
                new_tracked_ids[str(int_arr[-2])] = int_arr

        # Remove lost tracks
        for obj in list(self.tracked_objects.values()):
            if obj['id'] not in new_tracked_ids:
                # SORT will not return "missed" objects even though it still tracks them.
                # Therefore, we need to count in the max_age here as well.
                if self.disappeared[obj['id']] > self.max_age:
                    self.deregister(obj['id'])
                else:
                    self.disappeared[obj['id']] += 1

        # Add/update new trackings
        for tracker_id, track in new_tracked_ids.items():
            new_object_index = int(track[-1])
            enhanced_box = track[0:4]
            new_obj = new_objects[new_object_index]
            obj = {
                'label': new_obj[0],
                'score': new_obj[1],
                'box': enhanced_box,
                'area': new_obj[3],
                'region': new_obj[4],
                'frame_time': frame_time
            }
            centroid_x = int((obj['box'][0]+obj['box'][2]) / 2.0)
            centroid_y = int((obj['box'][1]+obj['box'][3]) / 2.0)
            obj['centroid'] = (centroid_x, centroid_y)
            if tracker_id not in self.tracked_objects:
                self.register(tracker_id, obj)
            else:
                self.update(tracker_id, obj)
