# Stationary Objects

An object is considered stationary when it is being tracked and has been in a very similar position for a certain number of frames. This number is defined in the configuration under `detect -> stationary -> threshold`, and is 10x the frame rate (or 10 seconds) by default. Once an object is considered stationary, it will remain stationary until motion occurs within the object at which point object detection will start running again. If the object changes location, it will be considered active.

## Why does it matter if an object is stationary?

Once an object becomes stationary, object detection will not be continually run on that object. This serves to reduce resource usage and redundant detections when there has been no motion near the tracked object. This also means that Frigate is contextually aware, and can for example [filter out recording segments](record.md#what-do-the-different-retain-modes-mean) to only when the object is considered active. Motion alone does not determine if an object is "active" for active_objects segment retention. Lighting changes for a parked car won't make an object active.

## Tuning stationary behavior

The default config is:

```yaml
detect:
  stationary:
    interval: 50
    threshold: 50
```

`interval` is defined as the frequency for running detection on stationary objects. This means that by default once an object is considered stationary, detection will not be run on it until motion is detected or until the interval (every 50th frame by default). With `interval >= 1`, every nth frames detection will be run to make sure the object is still there.

NOTE: There is no way to disable stationary object tracking with this value.

`threshold` is the number of frames an object needs to remain relatively still before it is considered stationary.

## Handling stationary objects

In some cases, like a driveway, you may prefer to only have an event when a car is coming & going vs a constant event of it stationary in the driveway. You can reference [this guide](../guides/parked_cars.md) for recommended approaches.

## Why does Frigate track stationary objects?

Frigate didn't always track stationary objects. In fact, it didn't even track objects at all initially.

Let's look at an example use case: I want to record any cars that enter my driveway.

One might simply think "Why not just run object detection any time there is motion around the driveway area and notify if the bounding box is in that zone?"

With that approach, what video is related to the car that entered the driveway? Did it come from the left or right? Was it parked across the street for an hour before turning into the driveway? One approach is to just record 24/7 or for motion (on any changed changed pixels) and not attempt to do that at all. This is what most other NVRs do. Just don't even try to identify a start and end for that object since it's hard and you will be wrong some portion of the time.

Couldn't you just look at when motion stopped and started? Motion for a video feed is nothing more than looking for pixels that are different than they were in previous frames. If the car entered the driveway while someone was mowing the grass, how would you know which motion was for the car and which was for the person when they mow along the driveway or street? What if another car was driving the other direction on the street? Or what if its a windy day and the bush by your mailbox is blowing around?

In order to do it more accurately, you need to identify objects and track them with a unique id. In each subsequent frame, everything has moved a little and you need to determine which bounding boxes go with each object from the previous frame.

Tracking objects across frames is a challenging problem. Especially if you want to do it in real time. There are entire competitions for research algorithms to see which of them can do it the most accurately. Zero of them are accurate 100% of the time. Even the ones that can't do it in realtime. There is always an error rate in the algorithm.

Now consider that the car is driving down a street that has other cars parked along it. It will drive behind some of these cars and in front of others. There may even be a car driving the opposite direction.

Let's assume for now that we are NOT already tracking two parked cars on the street or the car parked in the driveway, ie, there is no stationary object tracking.

As the car you are tracking approaches an area with 2 cars parked, the headlights reflect off the parked cars and the car parked in your driveway. The pixel values are different in that area, so there is motion detected. Object detection runs and identifies the remaining 3 cars. In the previous frame, you had a single bounding box from the car you are tracking. Now you have 4. The original object, the 2 cars on the street and the one in your driveway.

Now you have to determine which of the bounding boxes in this frame should be matched to the tracking id from the previous frame where you only had one. Remember, you have never seen these additional 3 cars before, so you know nothing about them. On top of that the bounding box for the car you are tracking has now moved to a new location, so which of the 4 belongs to the car you were originally tracking? The algorithms here are fairly good. They use a Kalman filter to predict the next location of an object using the historical bounding boxes and the bounding box closest to the predicted location is linked. It's right sometimes, but the error rate is going to be high when there are 4 possible bounding boxes.

Now let's assume that those other 3 cars were already being tracked as stationary objects, so the car driving down the street is a new 4th car. The object tracker knows we have had 3 cars and we now have 4. As the new car approaches the parked cars, the bounding boxes for all 4 cars is predicted based on the previous frames. The predicted boxes for the parked cars is pretty much a 100% overlap with the bounding boxes in the new frame. The parked cars are slam dunk matches to the tracking ids they had before and the only one left is the remaining bounding box which gets assigned to the new car. This results in a much lower error rate. Not perfect, but better.

The most difficult scenario that causes IDs to be assigned incorrectly is when an object completely occludes another object. When a car drives in front of another car and its no longer visible, a bounding box disappeared and it's a bit of a toss up when assigning the id since it's difficult to know which one is in front of the other. This happens for cars passing in front of other cars fairly often. It's something that we want to improve in the future.
