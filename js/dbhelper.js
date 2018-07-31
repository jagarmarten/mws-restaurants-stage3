/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

const dbPromise = idb.open('restaurantsDB', 3, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants', {
        keyPath: 'id'
      });
    case 1:
      const reviewsObjectStore = upgradeDB.createObjectStore('reviews', {
        keyPath: 'id'
      });
  }
});

/*Common database helper functions.*/
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    if (navigator.onLine) {
      dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        var keyValStore = tx.objectStore('restaurants');

        return keyValStore.getAll();
      }).then((values) => {
          if (values.length == 0) {
            //fetch data with Fetch API
            fetch(DBHelper.DATABASE_URL + "restaurants/")
              .then(function (response) {
                  return response.json();
              })
              .then(function (restaurants) {

                dbPromise.then(db => {
                  const tx = db.transaction('restaurants', 'readwrite');
                  var keyValStore = tx.objectStore('restaurants');

                  restaurants.forEach(function (restaurant) {
                    keyValStore.put(restaurant);
                  })

                  return tx.complete;
                }).then(() => console.log("Item added to the restaurantsDB"));
                callback(null, restaurants);
              }).catch(function (error) {
                console.log("Houston, we had an error!", error);
                callback(error, null);
              });
          } else {
            dbPromise.then(db => {
              const tx = db.transaction('restaurants', 'readwrite');
              var keyValStore = tx.objectStore('restaurants');
              return keyValStore.getAll();
            }).then((restaurants) => {
              console.log("Fetching from restaurantsDB");
              callback(null, restaurants);
            });
          }
        })
    } else {
      dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        var keyValStore = tx.objectStore('restaurants');
        return keyValStore.getAll();
      }).then((restaurants) => {
        console.log("Fetching from restaurantsDB");
        callback(null, restaurants);
      });
    }
    
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`./img/${restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

  /**
   * 
   * 
   * Fetch reviews for the current restaurant
   * 
   * We're first opening the idb database - reviews and then we're fetching from the server. When fetching from the server we also add the data into the idb for future use
   */
  static fetchReviews(callback) {
    //if the user is online then either fetch from server or from idb BUT if the user's offline then only fetch data from idb
    if (navigator.onLine) {
      dbPromise.then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        var keyValStore = tx.objectStore('reviews');
        
        return keyValStore.getAll();
      }).then(() => {
        //if the user's online then automatically fetch from the server and store it to the idb - this way the data's always gonna be fresh!
        console.log("fetching from server"); //logging the way the app is getting the reviews
        fetch(DBHelper.DATABASE_URL + "reviews/?restaurant_id=" + getParameterByName('id')) //fetching the review by restaurant id
        .then(function (response) {
          return response.json(); //return the json response
        })
        .then(function (reviews) {
          
          //storing every review into idb
          dbPromise.then(db => {
            const tx = db.transaction('reviews', 'readwrite');
            var keyValStore = tx.objectStore('reviews');

            reviews.forEach(function (review) {
              keyValStore.put(review); //store it into the idb (each of the reviews)
            })
            
            return tx.complete;
          }).then(() => console.log("Item added to the reviewsDB"));
          callback(null, reviews);
        }).catch(function (error) {
          console.log("Houston, we had an error!", error);
          callback(error, null);
        });
      });
    } else {
      dbPromise.then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        var keyValStore = tx.objectStore('reviews');
        return keyValStore.getAll();
      }).then((reviews) => {
        console.log("Fetching from reviewsDB");
        callback(null, reviews);
      });
    }

    //find all reviews with the restaurant_id the same as the id in the URL - this is gonna be used later for the if/else statement
    /*const byRestaurantId = id => value => value.restaurant_id == id;
    const value = values.filter(byRestaurantId(getParameterByName('id')));
    console.log(value);*/
    //if there are currently no reviews for the restaurant, then fetch them from the server. If there are, then fetch them from the idb - this is way faster!
    /*if(value == 0) {
      console.log("fetching from server"); //logging the way the app is getting the reviews
      fetch(DBHelper.REVIEWS_URL + getParameterByName('id'))
        .then(function (response) {
          return response.json();
        })
        .then(function (reviews) {
  
          dbPromise.then(db => {
            const tx = db.transaction('reviews', 'readwrite');
            var keyValStore = tx.objectStore('reviews');
  
            reviews.forEach(function (review) {
              keyValStore.put(review);
            })
  
            return tx.complete;
          }).then(() => console.log("Item added to the reviewsDB"));
          callback(null, reviews);
        }).catch(function (error) {
          console.log("Houston, we had an error!", error);
          callback(error, null);
        });
    } else {
      console.log("fetching from idb"); //logging the way the app is getting the reviews
      dbPromise.then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        var keyValStore = tx.objectStore('reviews');
        return keyValStore.getAll();
      }).then((reviews) => {
        console.log("Fetching from reviewsDB");
        callback(null, reviews);
      });
    }
  });*/
  }
  
  /**
   * Fetch a review by its ID.
   * 
   * This is used when an user is on a page like URL/?id=1 because we want to display only the reviews that should be there
   */
  static fetchReviewsByRestaurantId(id, callback) {
    // fetch all reviews with proper error handling.
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        //const review = reviews.find(r => r.restaurant_id == id);
        const byRestaurantId = id => review => review.restaurant_id == id;
        const review = reviews.filter(byRestaurantId(id)); //filter all reviews by restaurant id
        
        if (review) { // Got the review
          callback(null, review); //return the review
        } else { // Review does not exist in the database
          callback('Review does not exist', null);
        }
      }
    });
  }

  /**
   * This is a post method function I use when the user wants to add a new review. I have it here because I may want to use POST method sometime in the future
   */
  static postMethod(url, data) {
    //fetch with POST method
    /**
     * 1. Fetch the URL
     * 2. The method is post
     * 3. Adding all the properties like body (place where the data are) and headers
     * 
     * Then return a json
     * If unsuccessful then return it in the console and if it's successful, then also print it to the console
     *
     */
    fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(res => {
        return res.json()
      }).catch(error => console.error('Error:', error))
      .then(response => console.log('Success:', response));
  }

  /**
   * This is a PUT method function I use when the user wants to add a new review. I have it here because I may want to use PUT method sometime in the future
   */
  static putMethod(url, data) {
    //fetch with PUT method
    //This function is used when we're updating data in the server - I'm using it with the favorite button
    //return a json in the promise and also print if successful or unsuccessful (more detauls in postMethod() function
    fetch(url, {
        method: 'PUT'
      }).then(res => {
        return res.json()
      }).catch(error => console.error('Error:', error))
      .then(response => console.log('Success:', response));
  }

  /**
   * Add a new review (when the user's both online and offline)
   * 
   * In this project, we also had to have a mechanism which would allow the user to add a new revie when he's offline. The first method was using the BACK-SYNC but it was a bit harder to implement at first. The second one I found out about was using localStorage
   * 
   * Video my mentor 's sent me about BACK-SYNC: https://www.youtube.com/watch?v=cmGr0RszHc8&feature=youtu.be&t=40m
   * 
   * While making this form I mainly used this resources:
   * 1. https: //mxb.at/blog/offline-forms/ - in this tutorial, the localStorage is used.
   * 2. https: //developer.mozilla.org/en-US/docs/Web/API/Window/localStorage - MDN tutorials on locaStorage. .put(), .get()
   * 3. https: //docs.google.com/presentation/d/1i_b30OvHtmKXWI5oUknDIto5S2YnfJC619mYYq1QpJ4/edit#slide=id.g3da8a30f65_0_5 - it's your MWS PROJECT walkthrough in which I also discovered that it's a good idea to use localStorage
   * 4. https: //www.smashingmagazine.com/2010/10/local-storage-and-how-to-use-it/ - I also used this tutorial when learning how the localstorage works
   * 
   * I was really careful about PLAGIARISM while coding this project. The other resources I used were my tutor and my mentor. I also found many similarities in all of these resources.
   */
  static addNewReview(review) {
    //if the user is offline then do this
    if(!navigator.onLine) {
      console.log("The website is offline"); //logging that the user is offline
      DBHelper.sendWhenOnline(review); //calling the send when online function
      //open the IDB so that I could use it in this file as well
      return; //return the function
    }
    console.log("The website is online"); //log that the user is online
    DBHelper.postMethod(DBHelper.DATABASE_URL + "reviews/", review); //use the postMethod function
  }

  /**
   * This function is used every time a user goes offline and tries to submit form data
   */
  static sendWhenOnline(review) {

    //localStorageSubmit object in which I store the time at which the review was submited and the review data as well. The time could be used in future cases (as mentioned at mxb.at/blog/offline-forms/ such as when the user submits a review when he's offline and then he comes online after a month - the data could possibly be outdated
    const locaStorageSubmit = {
      time: new Date().getTime(),
      data: review
    };

    localStorage.setItem('reviewSubmit', JSON.stringify(locaStorageSubmit));

    //add event listener which looks for whether the user is online
    window.addEventListener('online', () => {
      //let localStorageData = localStorage.getItem('reviewSubmit'); //get the item stored in 'reviewSubmit'
      let localStorageData = JSON.parse(localStorage.getItem('reviewSubmit')); //get the item stored in 'reviewSubmit'
      console.log(localStorageData); //log the data from localStorage

      //in the restaurant_info.js I also remove the offline badge when the website is offline

      //if the local storage isn't empty, then addNewReview() func gets called and the item gets removed from the local storage
      if (localStorageData !== null) {
        console.log("Local storage data about to get removed"); //logging the action which's about to happen
        //var reviews = localStorage.getItem('reviewSubmit');
        DBHelper.addNewReview(localStorageData.data); //add new review
        localStorage.removeItem('reviewSubmit'); //remove 'reviewSubmit' from local storage
      }
    });
  }

  /**
   * Get a parameter by name from page URL.
   */
  static getParameterByName(name, url) {
    if (!url)
      url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
      results = regex.exec(url);
    if (!results)
      return null;
    if (!results[2])
      return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  /**
   * Change the value of the is_favorite when the button is pressed
   * 
   * In this function I open a new DB promise (restaurants store) and I update the is_favorite value in idb and in the server via a PUT method function() I've created above in the code.
   */
  static favoriteButtonUpdate(restaurant_id, value) {
    
    dbPromise.then(db => {
      return db.transaction('restaurants', 'readwrite')
      .objectStore('restaurants');
    }).then(function (obj) {
      //idb update the is_favorite
      dbPromise.then(function (db) {
        var tx = db.transaction('restaurants', 'readwrite'); //creating a new transaction
        var store = tx.objectStore('restaurants'); //creating a new obj store
        //store.put(obj.restaurant_id); //update the restaurat_id
        var getRestaurantFromIDB = store.get(restaurant_id)
        getRestaurantFromIDB.then(function(object) {
          object.is_favorite = value; //set the is_favorite the value we're passing in the main.js / 
          store.put(object); //update it
        }); 
        //console.log(obj); //console.log the obj
        return tx.complete; //return
      }).then(function () {
        console.log('item updated!'); //notify that the review has been updated
        DBHelper.putMethod(`http://localhost:1337/restaurants/${restaurant_id}/?is_favorite=${value}`, value); //sending the new value of is_favorite to the server via PUT method
      });
    })
  }
}
