# Getting JHMC online
This was written for JHMC 2021. 

## Running it locally
Run `npm install` then `npm run dev` in the root directory

## Getting it online
### Getting ready
JHMC is a node application, so it can be run on any environment that can run node. It can be run on a serverless environment, but it uses websockets for alerts, which won't work serverlessly for when the instance is spun down.

In 2021, I ran the server scripts on Google Cloud's App engine. The project id is `imsajhmc` and access to the project should be given by the website leaders from the year before. If you ever need access to the GCP project and cannot get it from prior chairs, [email me](mailto:reach@patrick.today).

If you go to the [app engine page for the project](https://console.cloud.google.com/appengine?serviceId=default&project=imsajhmc), you should the instance, which may be turned off or disabled due to prices. You may need to connect a billing account, but Google Cloud Platform often provides free credit (JHMC 2021 ran off of free credit). You'll then need to enable the instance, which likely requries connecting a billing account.

### Deploying the app
You'll need to install the [Cloud SDK](https://cloud.google.com/sdk/docs/install). You can check you have installed it correctly by running `gcloud -v`.

To login, run `gcloud auth login`, and login to your Google account. Make sure this is the same Google account that the `imsajhmc` project is shared with.

When you're ready to deploy your app, run `gcloud app deploy`. 

### Notes
1. You may get a message telling you to enable `Cloud Build`. According to [stackoverflow](https://stackoverflow.com/questions/52561749/gcloud-app-deploy-error-response-7-access-not-configured-cloud-build-has-n), this is really a message saying you must enable billing. 

## Stopping the app
During the offseason, keeping JHMC's homepage as a static site, or running it on cloud functions without websocket alerts might work better. Simply stop the instance in the app engine to do this.