**Frigate - Home Assistant - Blue Iris NVR automation example**

The basics:
Blue Iris is a normal "dumb" NVR software that records several camera RTSP streams and present it to an API and a number of user interfaces. There isnt any great local AI features built in, it normally triggers motion based on "motion detection" (that would be considered somewhat advanced). There´s a lot of false positives causing the NVR event recording to be somehwat useless. Yes, I know, there are several ways to tweak and fix this to lessen the false positives.
There are quite a community around the Blue Iris software and there are other stabs at making local AI such as the "aitool" with Deepstack.

I got inspired by the video from "The Hookup" on youtube explaining the setup with the "aitool" and Deepstack. I tried it and it works - ish.

Link to the video with all Blue Iris configuration: https://www.youtube.com/watch?v=fwoonl5JKgo

I base all my Blue Iris configuration on the example from the video above - but i´d just simply turned off picture save to folder feature (that the aitool uses to pick up the jpeg and send it deepstack). Instead I use frigate and a Home Assistant automation.

Installation:
* Make sure that your Blue Iris NVR has been configured so that the API calls and user/password has been set.
![Alt text](pics/BI_access.PNG?raw=true "Title")
![Alt text](pics/bi_aiuser.PNG?raw=true "Title")
* Test the HTTP request manually in a browser to see that it works and triggers recording of the HD camera instance in Blue Iris
* Then, just make a copy of the package yaml file above and adjust the entities accordingly into the folder '/config/packages' in your home assistant installation
* Reload Home Assistant and test trigger the automation

