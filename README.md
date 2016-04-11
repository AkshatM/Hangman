# About

This README describes my design choices for solving Coursera's Hangman UI interface challenge, as well as any major issues I encountered (and a solution, if found).

_Note: I am reproducing my solution here on GitHub to demonstrate my abilities and the way I approach design problems. If you like what you see/are reading and think I'd be a really good next hire, get in touch with me. Contact information is on [my website](http://www.akshatm.com)._

![A demo](https://github.com/AkshatM/Hangman/raw/master/demo.gif)

# Table of Contents

    Design Constraints
    Design
    Testing Methodology
    Possible Improvements
    Misc.
        File Structure

# Design Constraints

_I treated this exercise as if it was an actual application Coursera was planning to put into production. Everything that follows should be read keeping that perspective in mind._

I chose to adopt typical Coursera design constraints, namely:

1. Support for low-speed Internet connections.
    
    I define low-speed here to be 250 kbps. This definition has the benefit of being testable using Chrome's Network Monitor, as well as being substantially slower than a reasonable lower bound on worldwide average connection speed (which is 5 Mbps). Source: Akamai State of the Internet report 2015. It is also roughly equivalent to the slowest speeds in Brazil (where ADSL is popular and offers 256 - 512 kbps download speeds) and India (where minimum reported speed to the official telecommunications authority is about 399 kbps), the second and third most socially engaged perusers of Coursera content after the United States.
    
    Support here means that full page loading time (inclusive of scripts, assets, etc.) should be ideally less than or about two to three seconds for the lowest internet connection speed _without_ prior browser caching. Ideally, this notion should incorporate mobile latency, but I am unable to accurately test for this.
    
2. Support for page features across browsers that [Coursera officially supports](https://learner.coursera.help/hc/en-us/articles/201522945-Recommended-Browsers-and-Devices) across all devices.

    As a consequence, every effort is going to be made to use features supported across Chrome, Firefox, Safari and IE11, as well as across mobile devices. There will be no support for IE8 or IE9 in this application, which Coursera does not officially support and which Microsoft has dropped support for as of Jan. 12th 2016.

(Note that internationalisation is usually another design constraint, but the server backend - which is what keeps track of the game - only supports English, so this constraint is not applicable. I have no choice _but_ to use only English.)

At the same time, I wanted to adhere to basic usability principles:

1. Explicit directions at every stage for the user. Hangman is not universal.
2. Fast page responsiveness, minimising page rendering time. 
3. Failure tolerance. Sudden loss of connectivity should interrupt gameplay gracefully, and permit resumability without loss of data.
4. Strict input handling and sanitisation for usability.

Finally, I had one last constraint, namely time. This is ultimately a simple application built intermittently over three days. I chose to optimise user experience over perfect code - the resulting code is functional, readable, maintainable and adheres to as many best practices as possible, but it does not always take the optimal approach. In the following sections, I will address what I did and what possible improvements could be made that I did not have time for/ could have been made if I had access to the backend.

# Design

I tackled these problems by using the three following overarching approaches:

1. Minimising all content to reduce initial page load time without sacrificing functionality and user experience,
2. Minimising all future page requests,
3. Employing well-documented native client-side approaches where possible,

I used two libraries: React.js to organise my client-side views and Skeleton CSS as a CSS framework.
    
    Skeleton CSS was chosen because it is a Javascript-free CSS framework offering minimal styling and responsiveness in only 400 lines of CSS unminified. (When minified, it is less that 2 KB in size). Using it, I was able to ensure a minimum of aesthetic pleasantness as well as responsiveness for mobile. The cost of inclusion was outweighed by the benefits of use. Skeleton comes with normalise.css, which minified is also approx. 1.2 KB, bringing the total footprint to about 3 KB.
    
    React.js was chosen due to approaches 2 and 3. It is cross-browser (even supporting IE9) compliant, is relatively small when minified (about 39 KB, which is ~ 60 KB less than jQuery), is beginning to be well-cached from various websites Coursera users from Brazil/India/etc. are likely to visit, is purely client-side and well-documented, and makes it easy to follow global application state. The fact that it is also extensively used by Coursera means that Coursera users are likely to find it cached and Coursera developers will also be able to integrate it smoothly if necessary(*).

The application is structured as followed. 
   
* A CDN network (CDNJS) distributes the necessary minified and gzipped React and Skeleton files. Javascript files are loaded with `<script defer />`, enabling HTML rendering to finish prior to Javascript execution while reducing loading time. 

    On a 250 kbps connection with 7 total requests made with all files minified and cache disabled over a Python local hosting server run on the development machine, these steps bring initial page load time to 2.8 seconds on average. With cache enabled (ideal conditions), the same load time is around 600 ms.

* The initial HTML consists of friendly text-based instructions on how to play Hangman and an inline SVG describing a hangman complete with scaffold, giving users a feeling of engagement in the first 500 ms before Javascript assets arrive. Interaction is limited to viewing the hangman and reading the text until all scripts are loaded and mounted. (This is all incidentally in accordance with Coursera practice, as seen on [the tech blog](https://tech.coursera.org/blog/2015/08/18/why-and-how-coursera-does-isomorphic-javascript-a-fast-and-snappy-quiz/)) When JS assets are mounted, boilerplate text is replaced with a form that accepts an email address and commences with the game.

    Ideally, I would have liked to fully subscribe to standard Coursera practice and insert a pure HTML5 x-www-form-urlencoded form before Javascript was fully loaded, allowing the user to use the form at once. However, I was limited by two things: a) the backend server required a JSON-stringified object to be sent along in the POST request body. Not having access to Javascript, it did not appear such stringification was possible using just the raw values entered in the form, despite my best attempts to find a solution to this, b) the default action of a form on submit (unless the event is captured and appropriately handled) is to refresh the page, which would have triggered another round of request for assets. Inline Javascript was an option to accomplish both of these requirements, but would have reduced page rendering time. I chose to optimise for Javascipt loading time instead, and limit interaction until the page was fully loaded.
    
    I had the choice of using either an inline SVG or an image sprite for a Hangman image, as I was reluctant about including multiple images (thereby increasing page loading time) and unwilling to use HTML5 canvas (which requires JS and would basically be unusable until JS finished loading - kind of ruining the point). I made the decision to use inline SVG because a) React works well with SVG and supports many standard SVG tags and attributes - it would allow me to tightly bind game state transitions to different Hangman transitions simply by rendering different parts of the SVG as the number of attempts changed, whereas an image sprite would require multiple CSS declarations as a React component cycled between class names and would increase the CSS as a result, b) [prior comparisons](https://css-tricks.com/icon-fonts-vs-svg/) between images and SVGs favoured SVGs for everything except IE8 support (which this application does not support), and c) it was much faster to design (I could rig up a Hangman SVG in eight lines and change it rapidly, where drawing pixel by pixel would have taken me a few hours). The disadvantage of this approach is that it is harder to ensure SVGs are responsive - see [http://codepen.io/tigt/post/scaling-inline-svg-css-and-other-sadnesses](this post), although some successs (see Possible Improvements section) was obtained using our SVG in this regard.
    
    Finally, it is worth noting that when Javascript _is_ loaded, I end up using x-www-form-urlencoded in my POST request headers anyway.The form itself uses the HTML5 validation scheme for email and text input. If a workaround could be found for the two major issues in serialising form content to JSON string and event handling without Javascript, it would be possible to use HTML5 form submission prior to Javascript loading and ensure full user interactivity without major rewrites.

* Following Javascript mounting, the login form fires off an XMLHttpRequest to hangman.coursera/game and then mounts a React component on the entire page, removing the previously rendered HTML and inline SVG and replacing it with identical-looking (but now tightly synchronised with game state) React components under one parent component called (aptly) `<Parent />`. The old form is replaced with an input submission form that accepts at most one character; internal game state (including the current phrase) is tied to the parent component's state. 

    The official spec for the Coursera Hangman API states that it is JSONP-compatible. However, on investigating the response headers, I discovered that the Hangman API enables CORS. Since this is superior to JSONP (and since JSONP [does not work with POST](http://stackoverflow.com/questions/4508198/how-to-use-type-post-in-jsonp-ajax-call)) and works on the platforms I have to support, I chose to use this instead. 
    
    Concerns about mounting and rendering time for the initial replacement of HTML content are reasonable but not ultimately well-founded - testing on 250 Kbps connection, it takes approx. 500 ms for the XHR to complete for a single request and only a few more milliseconds (about 50 ms) thereafter to replace content entirely with the `Parent` component and its children. The bulk of the time is dominated by waiting for the XHR request to complete, making _that_ the bottleneck.
    
    The form itself is designed to ensure consistency, prevent accidental user errors and add to user experience. Multiple submissions are prevented by disabling submission on a single submit - on both failure and success of the subsequent XHR, the form is re-rendered with empty input, preventing the additional but repetitive keystrokes needed to delete the last entry. HTML5 validation is ensured throughout: a pattern attribute ensures that characers are strictly alphabetical, while a maxlength attribute prevents any submission greater than one character.
    
* The game phrase itself is styled using pure CSS, ensuring clear spacng between words and noticeable spacing between neighbouring characters in a single word. This greatly improves user experience. To improve rendering performance times, appropriate use of `shouldComponentUpdate` was leveraged to ensure certain aspects of the render tree were never touched. This was not necessary, as no noticeable rendering lag was noted in testing - I included it anyway as a best practice. The hangman is coupled to input so that decrements in the number of possible attempts triggers successive rendering of the hangman limbs.

* On completion of a game, the user is given the option to play again via a simple button. This does not require submission of a new email address - the old email initially entered is leveraged again to furnish a new game immediately. The games never end - the user is free to keep playing as long as they wish.

* It is finally worth mentioning that the entire application is network failure tolerant. On failure of an XHR request, the game state is not altered, so that anything the user did before network failure is untouched. At any moment when the network is re-established, the user is free to keep submitting input and the game continues as if uninterrupted. Text explaining that network connectivity is affecting gameplay appears on network failure. This is not flawless - see Testing Methodology and Possible Improvements for reasons why more investigation needs to be made - but it works and is functional.

# Testing Methodology

The application was mounted and served from a local Python 2.7 server on a Ubuntu laptop with 8 GB RAM and tested in Chrome and on a physical Samsung Galaxy S3 connected to the same network. I served it a) because it made access via mobile easier and b) it is more realistic of actual real life conditions.

Chrome devtools allowed me to throttle the network rate to about 250 Kbps, and disable cacheing, on Chrome, as well as test responsiveness on mobile for a Nokia N9, an Apple iPhone 6/5, laptop with touch, and Samsung Galaxy S3/S4 in landscape and portrait mode. 
I used Firefox's profiling tools to gather data about the total time taken for rendering in the initial mounting of `<Parent />`. I manually counted up the time taken for every major event following form submission to obtain that figure. 

Network connectivity tolerance and behaviour was tested by turning off all internet access to the testing laptop and computer between form submissions, and then turning it on again before making another form submission. This is not a perfect simulation of real network failure - it is possible that an XHR request could fail partway through transmission, and it is unclear how the application will handle that edge case. The application currently uses XHR2 (complete with onload and onerror functions, rather than the traditional onreadystatechange)*, and it is unclear despite my research whether XHR onerror is atomic in the sense of firing on the event of partial success.

(*) See Possible Improvements for a discussion on why this decision was made. 

# Possible Improvements

1. Enforcing equal height in both columns in the application. Currently, the inline SVG is able to scale based on viewport height and width, but the uneven heights prevent the SVG being proportional to the application form in certain orientations on mobile. This has detrimental impact in landscape mode on most mobile devices, with the hangman appearing much smaller than its neighbouring element - form submission in these modes often obscures the hangman was keyboard and nav menu pop up, and it requires scrolling to view the hangman in these events. Ideally, a flexbox should have been used to take care of this issue - however, I ran out of time and was unsure of how browser support in IE11 would take it. More traditional CSS approaches to solving this problem did not seem to work well with Skeleton's CSS (although perhaps that is just me demonstrating my awful intuition for CSS behaviour) - I left it unresolved, as switching from landscape to portrait is possible on mobile/tablet devices and improves application aesthetics greatly (this is a fairly common tactic used by people to improve the way websites look).

2. A known issue in Android allows users to type more than the character limit in an input form with maxlength enabled. The form submission accepts only the first character input, however, so the application is still functional in these circumstances - however, no workaround could be easily found despite Googling.

3. At several points in the code, the same boilerplate XHR POST is invoked over and over again, differing only in the nature of the payload as well as the onerror and onload functions. I attempted to write a wrapper for XHR but ran into readability issues and difficulty carefully distinguishing between context despite use of Function.prototype.bind (the goal was to pass the xhr wrapper methods belonging to the component while being able to read the response's text). Rather than invest too much time cleaning this up, I chose to work on more relevant parts of the application. Future iterations can improve on this callback invocation.

4. On a related note, the XHR boilerplate frequently used onload and onerror methods, syntax that belongs to the XHR2 specification. While cross-browser compliant on the supported platforms for this application, it is unclear whether these operations are atomic in the sense of firing on either complete success or on any error - it could be they only fire on certain types of error and events. It may be better to rewrite this code using thte traditional onreadystatechange method callback if these assumptions turn out not to be true. The decision to write code this way was driven by simple brevity and expediency - it was convenient to write and easy to duplicate.

5. Lack of a clean build system. I ran Babel's internal JSX transpiler as a background process, and minifed my code using JSCompress, an online web application. Ideally, a build system like Grunt could probably have improved workflow. I decided not to invest in it because of time constraints. 

6. Gzip compression was not enabled for hangman.min.js or page.min.css files. Enabling compression could improve rendering time. I leave this to be a true deployment issue, one that I could have implemented if I had access to the backend. 

7. Better network testing methodology was/is needed. Simulating partial transmission between the Hangman API and this computer, however, was a bit too much for a three-day application (and I had no idea how to reasonably do it with minimal interference). It might be cool to continuously probe for network and update dynamically when network is down, rather than wait for user input to trigger this.

8. The state element seenValues stores both successful and unsuccessful characters. It may be better to only display the unsuccessful characters as the successful ones are already displayed in the game phrase. (However, this is a subjective debate. I prefer it the way it is now simply because I've always played Hangman by writing down all my attempts regardless of success. It is also easier to write.) 

9. On the backend - it would be nice to provide the complete phrase when the user has lost. This would have greatly improved UX. A partial workaround would ordinarily have been to write a Hangman solver on the front end, but it would be no use in this case since API calls are exhausted by the time this situation occurs.

# Miscellaneous

Thanks again to Coursera for giving me the chance to do this. It was truly fun!

## File Structure

_Note: For reasons of confidentiality, I have chosen to omit providing any Coursera Hangman APIs and have not included the bundled production version, nor have I provided the `build/` folder. The contents you see now come solely from `dev/` _

The `dev` folder contains code used in development; `production` is the production-ready version of the same code (i.e. minified, extraneous items removed etc.).

Page javascript is contained in `hangman.min.js` in `build/` in both `dev` and `production`. You can read a non-minified version of it in `dev`, and the actual original JSX in `js_src` in `dev`. The original JSX is thoroughly documented with comments explaining every component and important function. 

Page CSS is contained in `page.min.css` in `build/` in both `dev` and `production`. You can read a non-minified version of it in `dev/css`.
