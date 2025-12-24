# Installing Frigate in TrueNAS

This guide provides step-by-step instructions for installing and configuring the TrueNAS Frigate app.

## Frigate Prerequisites

Refer to Frigate documentation and recommendations on hardware acceleration and camera requirements.
For optimal performance, Frigate benefits from dedicated hardware acceleration using:

- Google Coral USB/PCIe TPU provides the best performance for object detection.
- Intel integrated graphics with VAAPI provides good performance for video encoding/decoding.
- NVIDIA GPU provides excellent detection and encoding.
- CPU-only detection provides limited performance and is suitable for testing only.

## Before Installing the Frigate App

Before you begin installing the Frigate application, prepare your TrueNAS system.

### Adding Required Datasets

You can add the storage datasets for the app before you launch the **Install Frigate** wizard or use the **Create Dataset** option in the **Install Frigate** wizard storage configuration section to add required datasets.

![AddDatasetScreen](/img/truenas/AddDatasetScreenBasicOptions.png "Add Dataset Screen")

The app requires two datasets for proper operation: **config** and **media**.
The **config** dataset stores Frigate configuration files, and **media** stores recorded video clips and snapshots (size based on retention needs).

Cache storage for thumbnails and temporary files can be set to use a dataset, which makes stored data persist after a system restart.
The recommended storage option for cached data is to use the **tmpfs** storage option in the app installation wizard, which creates a directory in RAM that is cleared by a TrueNAS system restart.
If creating a dataset, select the parent dataset and add a dataset named **cache**.

To create the required datasets before installing the TrueNAS Frigate app, go to **Datasets**.
Select the dataset on the tree table where you want to nest the storage for the Frigate app. For example, */tank/apps* where *tank* is the root dataset for the pool, and *apps* is a parent dataset.
Click **Add Dataset**. Enter the name **config**, set the **Dataset Preset** to **Apps**, then click **Save**.
The dataset is added to the tree table under the parent dataset on the **Datasets** screen. For example, */tank/apps/config*.

If you want to organize the Frigate app storage under a parent named *frigate*, create this dataset first, then select it before you add the **config** dataset.
The **config** dataset is added under the parent dataset you selected. For example, */poolname/apps/frigate/config*.
  
Repeat the dataset creation process for the media storage dataset.
Select the parent dataset on the dataset tree table, and then click **Add Dataset**.
Enter **media** in **Name**, set **Dataset Preset** to **Apps**, and then click **Save**.

If you forget to select the parent dataset before adding the **media** dataset, it nests under the **config** dataset.
To correct this, delete the **media** dataset, select the parent dataset before you click **Add** to recreate the **media** dataset.

### Changing the Default Ports

We recommend using the default network ports assigned in the TrueNAS **Install Frigate** wizard.
If you want to use different port numbers, first, verify a desired port number is not assigned to a TrueNAS function.
Go to the [TrueNAS Default Ports](https://www.truenas.com/docs/solutions/optimizations/security/#truenas-default-ports) article to find the list of assigned ports.

### Prepare Hardware Acceleration information (optional)
  
Frigate performs best with dedicated hardware for video processing and AI object detection.
Before installing, identify what hardware acceleration is available on your TrueNAS system:

* Intel Integrated Graphics: Check if the device **/dev/dri/renderD128** exists on your system.
* NVIDIA GPU: Verify NVIDIA drivers are installed and your GPU is detected.
* Google Coral USB TPU: No preparation needed - simply enable **Mount USB Bus** during installation.

For detailed hardware detection instructions and configuration examples, see https://docs.frigate.video/configuration/hardware_acceleration.

You need the device paths for any available hardware to enter in the installation wizard.

#### Frigate Hardware Acceleration Requirements
For optimal performance, Frigate benefits from dedicated hardware acceleration.
Frigate recommends Google Coral USB/PCIe TPU, Intel integrated graphics with VAAPI, or NVIDIA GPU.

Frigate recommendations for CPU and RAM:
* CPU-only detection (limited performance) at a minimum
* 2GB RAM minimum, or 4GB+ recommended for multiple cameras

Frigate recommends setting the **media** dataset to use fast storage (SSD preferred).

#### Camera Preparation before installing Frigate:

* Ensure your IP cameras support RTSP streams.
* Identify the RTSP URL format for your camera(s).
* Locate and take note of the camera credentials (username/password) and have them ready to enter.
* Verify camera streams and connectivity with a tool like VLC.

## Installing the Frigate App in TrueNAS

Go to **Apps**, and click on **Discover Apps** to open the catalog of apps on the system.

Begin typing Frigate in the Search field to filter the catalog until the **Frigate** app shows on the screen.

![LocateFrigateAppWidget](/img/truenas/LocateFrigateAppWidget.png "Locating the Frigate App Widget")

Click on the Frigate app widget to open the Frigate information screen.

![FrigateInfoScreen](/img/truenas/FrigateInfoScreen.png "Frigate Information Screen")

Look at the **Run As Content** widget on the Frigate app information screen. The Frigate app runs as the root user (user ID 0).
You need this information when configuring storage permissions in the wizard.

Click **Install** to open the **Install Frigate** wizard.

![InstallFrigateScreen](/img/truenas/InstallFrigateScreen.png "Install Frigate Wizard")

Leave the default name set to **frigate** or you can enter a custom name. This name shows in the **Applications** table on the **Applications** screen.

Leave **Version** set to the default. This is the latest stable recommended version of the app in TrueNAS.
TrueNAS pushes updates as they become available. When an update is available, an update badge shows on the **Applications** screen beside the Frigate app row.

Clicking on a section header at the right of the **Install Frigate** wizard screen jumps to that section of the wizard, or you can scroll through the wizard and each section.

### Adding App Configuration Settings

Add the configuration settings beginning with the timezone. Select the timezone where your TrueNAS server is located from the dropdown list.
This ensures accurate timestamps in recordings and logs.

![InstallFrigateConfigSettings](/img/truenas/InstallFrigateConfigSettings.png "Frigate Configuration Settings")

Choose the setting for your use case on the **Image Selector** dropdown list.
**Normal Image** is the default setting, or choose from the other options to suit your use case.
Options are **TensorRT Image**, **ROCm Image**, or **Hailo-iL Image**. 

Enter the memory value based on your camera count in **Shared Memory Size**. Options are:
* **64 MiB** for 1-2 cameras at 1080p
* **128 MiB** for 3-5 cameras  
* **256 MiB** for 6+ cameras or 4K streams

If using Google Coral, select the **Mount USB Bus** option to enable USB TPU accelerators.

(Optional) Click **Add** next to **Devices** to show the **Host Device** and **Container Device** fields where you add these devices.
Refer to the [Hardware Acceleration Configuration](#hardware-acceleration-configurations) section above for more information.

GPU devices are configured in the **Resources Configuration** section.

You can log into your Frigate account to configure devices such as cameras, detection zones, and set storage retention policies.
Cameras are configured in a yaml file and not in the TrueNAS **Install Frigate** wizard.

The TrueNAS app is configured with the required environment variables. Add custom variables only if needed for your specific configuration.
Environment variables to consider:
* FRIGATE_RTSP_PASSWORD - if using RTSP restreaming in Frigate.
* PLUS_API_KEY - if using Frigate+ (cloud service, subscription required)

### Configuring Network Settings

Accept the port assignments in **Network Configuration**.
TrueNAS uses port number **30193** for the Frigate app.
If you want to use authentication, use the **WebUI Port (Auth)** settings. Otherwise, use the **WebUI Port (No Auth)** settings, which do not require authentication.

If you change **Port Bind Mode** to **Expose port for inter-container communication**, only the **WebUI Port (No Auth)** settings show.

![InstallFrigateNetworkConfig](/img/truenas/InstallFrigateNetworkConfig.png "Network Configuration Settings")

We recommend leaving **Host Network** disabled. Enabling this setting binds to the host network.
If you want to bind IP addresses on the host to the Frigate app, click **Add** to the right of **Host IPs**, then enter the IP address and netmask in the fields.
Click again for each IP address you want to bind.

If using RTSP, WebRTC, or Go2RTC, select the **Port Bind Mode** on the dropdown list for each that applies.

### Configuring Storage

Add your **Storage Configuration** settings. For **Frigate Config Storage** do the following:

Set **Type** to **Host Path (Path that already exists on the system)**.
Select **Enable ACL**. Use the file browser to navigate to the required dataset. 
If the **config** dataset is not created yet, browse to the parent dataset and click on it to activate the **Create Dataset** option.
Create the **config** dataset. 

![InstallFrigateStorageConfigHostPathACLandACE](/img/truenas/InstallFrigateStorageConfigHostPathACLandACE.png "Configuring Storage for the config Dataset")

Add an ACE entry for user ID **0** and give it **FULL_CONTROL** permission.

Select **Force Flag** to allow app upgrades when the dataset has existing data.

Repeat the steps above for **Frigate Media Storage**, selecting the **media** dataset.

![InstallFrigateStorageMediaHostPathACLandACE](/img/truenas/InstallFrigateStorageMediaHostPathACLandACE.png "Configuring Storage for the media Dataset")

For **Cache Storage**, set **Type** to **tmpfs** to create a directory in RAM for temporary storage (the recommended option).
Select the **Tmpfs Size Limit** option, and accept the default, which is **500**.

![InstallFrigateStorageCacheTmpfs](/img/truenas/InstallFrigateStorageCacheTmpfs.png "Configure tmpfs for Cache Storage")

Alternatively, to have the cache data persist after restarting the Frigate app, set **Type** to **Host Path**.
Repeat the steps for **Frigate Config Storage** above to set up the host path for the optional **cache** dataset and configure ACL permissions.

#### Configuring Resources

Accept the default settings in the **Resources Configuration** section.
If your system has a GPU, select the **GPU Passthrough** option. 
TrueNAS configures the app for your GPU device. If the GPU is an Nvidia GPU, TrueNAS automatically updates drivers.

### Completing the Installation

Review all settings, then click **Install**. Truenas begins installing the app and applying the settings you configured!

When the installation completes the **Applications** screen shows **Frigate** on the **Applications** table with the status shown as **Running**.

![FrigateAppRunning](/img/truenas/FrigateAppRunning.png "Frigate App Installed")

To open the Frigate web UI and log into your Frigate account, click **Web UI** on the Frigate **Application Info** widget.

Refer to Frigate user instructions to configure cameras, define detection zones, set retention policies, and customize the app and Frigate account to suit your use case. The section below summarizes completing the Frigate setup in the Frigate UI and additional TrueNAS information you might need.

## Completing the Frigate Setup

After installing and deploying the Frigate app in TrueNAS, log into your Frigate account through the Frigate web interface to customize settings like adding cameras, setting detection zones, and setting storage retention policies. Refer to Frigate documentation for all setting options available to you.

To customize your Frigate app, you can edit the Frigate <file>config.yaml</file> file, which is stored in TrueNAS the **config** dataset.

Advanced users can use the option to convert their wizard deployment of the app to a custom app deployment, but this cannot be reversed.
Click on the three-dot menu icon on the **Application Info** widget and select **Convert to custom app**.
Converting to a custom app deployment allows you to access and edit the Frigate <file>config.yaml</file> file in the TrueNAS UI, but you can choose one of the other options available to you to edit this file and not permanently change the app deployment in the TrueNAS UI. Options to access and edit the <file>config.yaml</file> file:
* Log into your Frigate account and edit the config.yaml file through the Frigate web interface.
* Use the container shell option in the **Workloads** widget for Frigate, found on the **Applications** screen.

### Applying Configuration Changes

After you make changes to the Frigate <file>config.yaml</file> file, you must reset the app in the TrueNAS UI.
After saving the <file>config.yaml</file> file, restart the Frigate app in TrueNAS.
Go to **Applications** screen in the TrueNAS UI. Locate the Frigate app on the table, then click the **Restart** button for the Frigate app.

### Basic Camera Configuration

If you do not find the <file>config.yaml</file> file, create it using the Frigate web UI.
Create a minimal <file>config.yaml</file> file:

```yaml
mqtt:
  enabled: false

cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://username:password@camera-ip:554/stream1
          roles:
            - detect
            - record
    detect:
      width: 1920
      height: 1080
      fps: 5

  back_yard:
    ffmpeg:
      inputs:
        - path: rtsp://username:password@camera-ip2:554/stream1  
          roles:
            - detect
            - record
    detect:
      width: 1920
      height: 1080
      fps: 5

record:
  enabled: true
  retain:
    days: 7
    mode: motion

snapshots:
  enabled: true
  retain:
    default: 14

objects:
  track:
    - person
    - car
    - bicycle
```

### Hardware Acceleration Configurations

The TrueNAS **Install Frigate** wizard configures the GPU settings in the **Resources Configuration** section.

Selecting the  **Mount USB Bus** option in the TrueNAS **Install Frigate** wizard is the easiest way to set up USB, but if you want to edit the Frigate <file>config.yaml</file> file, add the following content based on your use case:

#### Google Coral TPU

```yaml
detectors:
  coral:
    type: edgetpu
    device: usb
```

#### Intel GPU (VAAPI)

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

#### NVIDIA GPU

```yaml
ffmpeg:
  hwaccel_args: preset-nvidia-h264
```

### Detection Zones Setup

You can edit the Frigate <file>config.yaml</file> file in your Frigate account to limit detection to specific areas to reduce false positives:

```yaml
cameras:
  front_door:
    zones:
      entry_area:
        coordinates: 100,100,400,100,400,300,100,300
    objects:
      filters:
        person:
          mask: 0,0,100,0,100,100,0,100  # Exclude area
        car:
          min_area: 5000  # Minimum size
          threshold: 0.7  # Detection confidence
```

### Retention Policies

TrueNAS allows you to set up, schedule, and manage snapshots of the Frigate datasets in the TrueNAS UI!
For information on managing snapshots, see [Creating Snapshots](https://www.truenas.com/docs/scale/scaletutorials/datasets/creatingsnapshots/).

Configure automatic cleanup by modifying the Frigate <file>config.yaml</file>:

```yaml
record:
  enabled: true
  retain:
    days: 7
    mode: motion
  events:
    retain:
      default: 14
      objects:
        person: 30

snapshots:
  enabled: true
  retain:
    default: 14
    objects:
      person: 30
```

### Multiple Streams

Use separate streams for detection and recording, edit the Frigate <file>config.yaml</file> file:

```yaml
cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://username:password@camera-ip:554/substream
          roles:
            - detect
        - path: rtsp://username:password@camera-ip:554/mainstream  
          roles:
            - record
    detect:
      width: 640   # Lower resolution for detection
      height: 480
      fps: 5
```

## Troubleshooting Tips

### Common Issues

**Container Does Not Start**
- Verify dataset permissions.
  If you correctly set the permissions with the **ACE Entry** settings in the **Install Frigate** wizard, the app deploys and the container is created.
  If you did not add the root user ID as an ACE Entry for all datasets, the app fails to deploy.

- Check shared memory size is adequate for camera count
  To see what you configured, go to the **Applications** screen in the TrueNAS UI, select the **Frigate** app row on the table, then click **Edit** on the **Applications Info** widget.
  The **Edit Frigate** screen opens, showing the current settings in the UI.
  Change the value in **Share Memory Size (in MiB)** to a new value. Options are:
     - **64 MiB** - The default setting for 1-2 cameras.
     - **128 MiB** - The recommended setting for 3-5 cameras.
     - **256 MiB** - The setting for 6+ cameras or higher resolution streams.
  Click **Update**.

- Review container logs in the TrueNAS application. See [Log Analysis](#log-analysis) below for information on accessing the Frigate container logs.

**Camera Connection Fails**
- Test RTSP URL directly with VLC or a similar tool.
- Verify camera credentials.
- Check network connectivity between TrueNAS and cameras.
- Ensure firewall allows RTSP traffic.

**Poor Detection Performance**
- Increase shared memory allocation.
- Enable hardware acceleration if available.
- Reduce detection frame rate (5 FPS is often sufficient).
- Lower detection resolution for high-resolution cameras.

**High CPU Usage**
- Enable hardware acceleration if not already configured.
- Reduce detection frame rates.
- Use substreams for detection.
- Optimize detection zones.

### Log Analysis

TrueNAS provides access to logs for the Frigate app container and the status of the app and container.
Go to the TrueNAS UI **Applications** screen, and select the Frigate row in the **Applications** table.
Locate the **Workloads** widget to the right of the table. 

![FrigateWorkloadsWidget](/img/truenas/FrigateWorkloadsWidget.png "Frigate Workloads Widget")

Hover over the three icons to see the label for the icon.
The widget shows three icons that provide access to the shell, logs, and volume mounts for the container.
Click on the logs icon. The **Logs Details** dialog opens. Click **Connect** to open the shell screen with the container logs.

Use the scroll bar on the right side of the **Container Logs** screen to search through the logs, and look for error messages related to cameras or detection.

### Performance Optimization

**Memory Usage**
- Monitor shared memory usage in logs.
- Adjust shared memory size based on actual usage.
- Consider the **tmpfs** for cache storage if not already configured.

**Storage Management**
- Monitor **media** dataset usage. In the TrueNAS UI, go to the **Datasets** screen for information on the **media** dataset.
  Also, check the **Storage Dashboard** to see the state of the pool hosting the dataset. If there is a disk issue, it shows on the **Storage Dashboard**.
- Implement retention policies, and set up a schedule to regularly clean up old recordings.

**Network Optimization**
- Use appropriate stream resolutions.
- Configure substreams for detection.
- Monitor network bandwidth usage.

## Frigate Documentation Resources

- [Official Frigate Documentation](https://docs.frigate.video/)
- [Frigate GitHub Repository](https://github.com/blakeblackshear/frigate)
- [TrueNAS SCALE Documentation](https://www.truenas.com/docs/scale/)
- [Camera Configuration Examples](https://docs.frigate.video/configuration/cameras/)

## Contributing to this article

If you encounter issues or have suggestions for improving this guide, please consider contributing to the Frigate documentation or opening an issue on the GitHub repository.