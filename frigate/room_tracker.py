import datetime


class RoomTrackerObj:
    def __init__(self, obj):
        self.obj = obj
        self.checkpoint = None
        self.past_leave_checkpoint = False
        self.start_room = None  # Area conf name


class RoomTracker:
    """Tracks which rooms persons/objects are in.

    This tracker works on top of the detection tracker.
    """

    def __init__(self, config):
        """Initialization.

        See config.example.yaml for more information about the configuration variables.

        Args:
            config: Root of "room_tracker" user config section.
        """
        self.rooms_conf = config.get("rooms", {})
        self.min_distance_leave = config.get("min_distance_leave", 200)  # To reach first checkpoint (leave)
        self.min_distance_enter = config.get("min_distance_enter", 100)  # To reach second checkpoint (enter)
        self.region_width = config.get("region_width", 500)
        self.region_height = config.get("region_height", 500)
        self.max_count_in_rooms = config.get("max_count_in_rooms", 2)
        self.min_history = config.get("min_history", 10)
        self.verbose = True if "verbose" in config and config["verbose"] else False

        self.tracked_room_objects = {}
        self.new_objects = {}
        self.changed = False
        self.area_trackings = []
        self.last_update = {}  # room_name: timestamp

    def on_change(self, frame_time, new_tracked_objects):
        """To be called on every detection tracker update."""
        self.changed = False

        for obj in new_tracked_objects.values():
            self._add_if_new_track(obj)
            if obj['id'] not in self.tracked_room_objects:
                continue
            room_obj = self.tracked_room_objects[obj['id']]
            self._update(room_obj, obj)
            if self._has_left_room(room_obj):
                self._register_leave(room_obj)

        self.expired = []
        for id, room_obj in self.tracked_room_objects.items():
            if self._has_lost_track(room_obj, new_tracked_objects):
                if self._enter_room_conditions_met(room_obj):
                    self._register_enter(room_obj)
                self.expired.append(room_obj)

        for room_obj in self.expired:
            self._expire(room_obj)

        if self.verbose:
            self._print_summary_if_changed()

    def get_area_count(self, room_name):
        """Returns amount of objects inside room."""
        count = 0
        for t in self.area_trackings:
            if t["room"] == room_name:
                count += 1
        return count

    def get_latest_change_timestamp(self, room_name):
        """Returns timestamp for latest room count change."""
        if room_name in self.last_update:
            return self.last_update[room_name]
        return datetime.datetime.fromtimestamp(0).isoformat()

    def _debug(self, msg):
        print("[RoomTracker] " + msg)

    def _print_summary_if_changed(self):
        if self.changed:
            self._debug(f"{'=' * 6} Score {'=' * 6}")
            for n, _ in self.rooms_conf.items():
                self._debug(f"{self.get_area_count(n):>2} {n}")
            self._debug("=" * 19)

    def _add_if_new_track(self, obj):
        """Start tracking object if conditions met."""
        if len(obj['history']) < 4:
            # Filter potential false positives
            return

        if obj['id'] not in self.tracked_room_objects:
            room_obj = RoomTrackerObj(obj)
            room_obj.checkpoint = obj['history'][0]['centroid']
            room_name = self._get_closest_room(room_obj.checkpoint)
            room_obj.start_room = room_name
            self.tracked_room_objects[obj['id']] = room_obj

            if self.verbose:
                self._debug(f"ID '{obj['id']}' found coming from '{room_name}'.")

    def _update(self, room_obj, obj):
        """Update room object with newest track information."""
        if obj['id'] not in self.tracked_room_objects:
            return

        room_obj = self.tracked_room_objects[room_obj.obj['id']]
        room_obj.obj = obj

        if self.verbose:
            distance = self._manhattan_distance(room_obj.checkpoint, room_obj.obj['centroid'])
            self._debug(f"ID '{room_obj.obj['id']}' updated."
                        f" History: {len(room_obj.obj['history'])},"
                        f" Distance checkpoint: {distance}")

    def _has_left_room(self, room_obj):
        """Returns True if room object is allowed to leave a room."""
        if room_obj.past_leave_checkpoint or room_obj.start_room is None:
            return False

        start_room = room_obj.start_room
        area_point = (self.rooms_conf[start_room]['point_x'], self.rooms_conf[start_room]['point_y'])
        distance_from_checkpoint = self._manhattan_distance(room_obj.checkpoint, room_obj.obj['centroid'])

        if distance_from_checkpoint >= self.min_distance_leave and len(room_obj.obj['history']) >= self.min_history:
            return True
        return False

    def _register_leave(self, room_obj):
        """Update room object state and decrease room count on start room."""
        room_obj.past_leave_checkpoint = True

        # Set checkpoint to the history object closest to min_distance_leave.
        for history_obj in room_obj.obj['history']:
            distance = self._manhattan_distance(room_obj.checkpoint, history_obj['centroid'])
            if distance >= self.min_distance_leave:
                room_obj.checkpoint = history_obj['centroid']
                break

        if self.verbose:
            self._debug(f"ID '{room_obj.obj['id']}' left '{room_obj.start_room}'.")

        self._remove_from_room(room_obj.start_room)

    def _has_lost_track(self, room_obj, new_tracked_objects):
        """Returns True if we have lost track of the room object."""
        return (room_obj.obj["id"] not in [obj["id"] for obj in new_tracked_objects.values()])

    def _enter_room_conditions_met(self, room_obj):
        """Returns true if room objects is allowed to enter a room."""
        if len(room_obj.obj['history']) > 0:
            distance = self._manhattan_distance(room_obj.checkpoint, room_obj.obj['centroid'])
        else:
            distance = 0

        if self.verbose:
            # Print placed here to be able to print distance of lost tracks.
            self._debug(f"ID '{room_obj.obj['id']}' lost."
                        f" Distance: {distance}, History: {len(room_obj.obj['history'])}")

        return (len(room_obj.obj['history']) >= self.min_history and
                room_obj.past_leave_checkpoint and distance > self.min_distance_enter)

    def _register_enter(self, room_obj):
        """Enter closest room (if there is one) and increase room count."""
        room_name = self._get_closest_room(room_obj.obj['centroid'])

        if self.verbose:
            self._debug(f"ID '{room_obj.obj['id']}' entered '{room_name}'. History: {len(room_obj.obj['history'])}")

        if room_name is not None:
            self._add_to_room(room_name)

    def _expire(self, room_obj):
        """Remove room object from room tracker."""
        del self.tracked_room_objects[room_obj.obj["id"]]

    def _add_to_room(self, room_name):
        """Increase room count on room."""
        self.changed = True
        self.last_update[room_name] = datetime.datetime.now().isoformat()
        self.area_trackings.append({
            "room": room_name
        })

        if self.max_count_in_rooms != 0 and len(self.area_trackings) > self.max_count_in_rooms:
            self.area_trackings = self.area_trackings[-self.max_count_in_rooms:]

    def _remove_from_room(self, room_name):
        """Decrease room count on room."""
        self.changed = True
        self.last_update[room_name] = datetime.datetime.now().isoformat()
        for i, t in enumerate(self.area_trackings):
            if t["room"] == room_name:
                self.area_trackings.pop(i)
                return

    def _manhattan_distance(self, p1, p2):
        return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])

    def _get_closest_room(self, obj_point):
        """Returns the closest room.

        Will return None if none could be found (e.g. not in any room point area).
        """
        closest = None
        for room_name, room_conf in self.rooms_conf.items():
            ioa_point = (room_conf['point_x'], room_conf['point_y'])
            distance = self._manhattan_distance(obj_point, ioa_point)
            if closest is None or closest[1] > distance:
                if self._is_within_area_region(obj_point, ioa_point):
                    closest = (room_name, distance)

        if closest is None:
            return None
        return closest[0]

    def _is_within_area_region(self, point, area_center):
        point_x = point[0]
        point_y = point[1]
        area_center_x = area_center[0]
        area_center_y = area_center[1]
        return ((point_x > area_center_x - self.region_width) and
                (point_x < area_center_x + self.region_width) and
                (point_y > area_center_y - self.region_height) and
                (point_y < area_center_y + self.region_height))