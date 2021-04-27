# Junior High Math Contest Website

## Purpose
JHMC has been an in person competition hosting over 450 middle schoolers from around the state of Illinois for 31 years. After COVID struck the US, we had to move the competition to a virtual format. There was really no available way to have hundreds of middle school students take a math competition at the same time. Most other math competitions that hadn't previously been virtual had cancelled the contest due to virtual competition difficulties.

Because we didn't want to cancel JHMC this year, we decided to make a test-taking site for JHMC. At first, it was just a small form allowing students to input answers, with the problems displayed above it. It evolved to much more. Each student had their own schedule page, which gave them a Zoom link and the link for them to take their test. It also included websocket alerts — so we could instantly notify every contest participant about a change of schedule or any other information. It was a central figure for the contest. While the website isn't served anymore due to costs, you can always run it with `nodemon index.js`.

There is also a tool that inputs roster data into a spreadsheet, an auto-grader for the tests, and a tool that generates schedule links for all the students, all in `./one-time-scripts`.

## Technologies Used
* Airtable
* Websockets
* Node.JS
* Express
* Google Cloud
* Git/GitHub
* TypeScript
* Markdown
* MathJAX
* LaTeX

## Screenshots
The contest homepage
![assets/homepage.png](Homepage)

A sample student schedule. These were dynamically generated for 300 students.
![assets/schedule.png](Schedule)

A sample testing page. The answers sync to Airtable.
![assets/test.png](Test)

An alert pushed to the client using Websockets. 
![assets/alert.png](Alert)

See the [](logistics powerpoint) and the [](sample score report).