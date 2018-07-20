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

/*Common database helper functions.*/
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants/`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    const dbPromise = idb.open('restaurantsDB', 3, upgradeDB => {
      switch (upgradeDB.oldVersion) {
        case 0:
          upgradeDB.createObjectStore('restaurants', {
            keyPath: 'id'
          });
        case 1:
          upgradeDB.createObjectStore('reviews', {
            keyPath: 'id'
          });
      }
    });

    if (navigator.onLine) {
      dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        var keyValStore = tx.objectStore('restaurants');

        return keyValStore.getAll();
      }).then((values) => {
          if (values.length == 0) {
            //fetch data with Fetch API
            fetch(DBHelper.DATABASE_URL)
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
   * Reviews URL.
   * Change this to restaurants.json file location on your server.
   */
  
  static get REVIEWS_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/reviews/?restaurant_id=`;
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
      }).then((values) => {
        
        //find all reviews with the restaurant_id the same as the id in the URL - this is gonna be used later for the if/else statement
        const byRestaurantId = id => value => value.restaurant_id == id;
        const value = values.filter(byRestaurantId(getParameterByName('id')));
        console.log(value);

        //if there are currently no reviews for the restaurant, then fetch them from the server. If there are, then fetch them from the idb - this is way faster!
        if(value == 0) {
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
}
