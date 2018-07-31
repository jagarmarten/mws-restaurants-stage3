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
   * Fetch reviews for the current restaurant
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
        fetch(DBHelper.DATABASE_URL + "reviews/?restaurant_id=" + getParameterByName('id'))
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
   */
  static fetchReviewsByRestaurantId(id, callback) {
    // fetch all reviews with proper error handling.
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        //const review = reviews.find(r => r.restaurant_id == id);
        const byRestaurantId = id => review => review.restaurant_id == id;
        const review = reviews.filter(byRestaurantId(id));
        
        if (review) { // Got the review
          callback(null, review);
        } else { // Review does not exist in the database
          callback('Review does not exist', null);
        }
      }
    });
  }

  /**
   * This is a post method function
   */
  static postMethod(url, data) {
    //fetch with POST method
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
   * This is a post method function
   */
  static putMethod(url, data) {
    //fetch with POST method
    fetch(url, {
        method: 'PUT'
      }).then(res => {
        return res.json()
      }).catch(error => console.error('Error:', error))
      .then(response => console.log('Success:', response));
  }

  /**
   * Add a new review (when the user's both online and offline)
   */

  //this helped a lot - https://docs.google.com/presentation/d/1i_b30OvHtmKXWI5oUknDIto5S2YnfJC619mYYq1QpJ4/edit#slide=id.g3da8a30f65_0_5
  
  static addNewReview(review) {
    //if the user is offline then do this
    
    if(!navigator.onLine) {
      console.log("The website is offline"); //logging that the user is offline
      DBHelper.sendWhenOnline(review); //calling the send when online function
      //open the IDB so that I could use it in this file as well
      return;
    }

    console.log("The website is online");
    DBHelper.postMethod(DBHelper.DATABASE_URL + "reviews/", review); //use the postMethod function
  }

  /**
   * This function is used every time a user goes offline and tries to submit form data
   */
  static sendWhenOnline(review) {
    localStorage.setItem('data', JSON.stringify(review)); //create a new item in the local storage with review data

    //add event listener which looks for whether the user is online
    window.addEventListener('online', () => {
      let localStorageData = JSON.parse(localStorage.getItem('data')); //get the item stored in 'data'
      console.log(localStorageData);

      if (document.getElementById('offlineBadge')) {
        reviewsInfo.removeChild(document.getElementById('offlineBadge'));
      }

      //if the local storage isn't empty, then addNewReview() func gets called and the item gets removed from the local storage
      if (localStorageData !== null) {
        console.log("Local storage data about to get removed"); //logging the action which's about to happen
        DBHelper.addNewReview(localStorageData); //add new review
        localStorage.removeItem('data'); //remove 'data' from local storage
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
   */
  static favoriteButtonUpdate(restaurant_id, value) {
    DBHelper.putMethod(`http://localhost:1337/restaurants/${restaurant_id}/?is_favorite=${value}`, value); 
    
    dbPromise.then(db => {
      return db.transaction('restaurants', 'readwrite')
      .objectStore('restaurants');
    }).then(function (obj) {
      //idb update the is_favorite
      dbPromise.then(function (db) {
        var tx = db.transaction('restaurants', 'readwrite');
        var store = tx.objectStore('restaurants');
        //store.put(obj.restaurant_id); //update the restaurat_id
        var getRestaurantFromIDB = store.get(restaurant_id)
        getRestaurantFromIDB.then(function(object) {
          object.is_favorite = value; //set the is_favorite the value we're passing in the main.js / 
          store.put(object); //update it
        }); 
        return tx.complete;
      }).then(function () {
        console.log('item updated!');
      });
    })
  }
}
