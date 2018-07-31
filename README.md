# Mobile Web Specialist Certification Course - stage 3
---

## Project Overview: Stage 3

In this stage I had to add 2 things to the application:
    1. Adding a favorite button to the restaurants - user is able to favorite his/her restaurant
    2. Adding a form for users to submit their own restaurant review
All of the new functionalities had to be created **offline first** - the form works even when offline as well as does the button.

### Website

You can try this project right in your web browser with this url: https://jagarmarten.github.io/mws-restaurants-stage3/
You also need to download and execute server from this url: https://github.com/udacity/mws-restaurant-stage-3

# NOTES

In this project, we also had to have a mechanism which would allow the user to add a new revie when he's offline. The first method was using the BACK-SYNC but it was a bit harder to implement at first. The second one I found out about was using localStorage.
   
Video my mentor 's sent me about BACK-SYNC: https://www.youtube.com/watch?v=cmGr0RszHc8&feature=youtu.be&t=40m
    
While making this form I mainly used this resources:
1. https: //mxb.at/blog/offline-forms/ - in this tutorial, the localStorage is used.
2. https: //developer.mozilla.org/en-US/docs/Web/API/Window/localStorage - MDN tutorials on locaStorage. .put(), .get()
3. https: //docs.google.com/presentation/d/1i_b30OvHtmKXWI5oUknDIto5S2YnfJC619mYYq1QpJ4/edit#slide=id.g3da8a30f65_0_5 - it's your MWS PROJECT walkthrough in which I also discovered that it's a good idea to use localStorage
4. https: //www.smashingmagazine.com/2010/10/local-storage-and-how-to-use-it/ - I also used this tutorial when learning how the localstorage works
    
I was really careful about PLAGIARISM while coding this project. The other resources I used were my tutor and my mentor. I also found many similarities in all of these resources.

# Audit
The audit I run on Incognito Google Chrome (Linux) gave me these results:

index.html:
    Performance: 99,
    PWA: 100,
    Accessibility: 94

restaurant.html:
    Performance: 99,
    PWA: 100,
    Accessibility: 90