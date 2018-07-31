let restaurant;
var map;

//open the IDB so that I could use it in this file as well
/*const dbPromise = idb.open('restaurantsDB', 3, upgradeDB => {
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
});*/

const id = DBHelper.getParameterByName('id'); //get the restaurant id
/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

fetchReviewsFromURL = () => {
  DBHelper.fetchReviewsByRestaurantId(id, (error, review) => {
    self.review = review;
    if (!review) {
      console.error(error);
      return;
    }
    fillReviewsHTML(review);
  });
}
fetchReviewsFromURL();

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  
  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.alt = restaurant.name;
  image.title = restaurant.name + " restaurant";
  image.src = DBHelper.imageUrlForRestaurant(restaurant) + ".jpg";
  
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  
  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  const section = document.getElementById("restaurant-container"); //get the section

  let button = document.createElement('input'); //create new input element
  button.setAttribute('type', 'button'); //make this input of type button
  button.classList.add("button-favorite");
  button.value = "❤";

  button.addEventListener("click", function () {
    DBHelper.favoriteButtonUpdate(restaurant.id, !restaurant.is_favorite);
    restaurant.is_favorite = !restaurant.is_favorite; //assigning it an opposite value
    DBHelper.favoriteButtonChange(restaurant.is_favorite);
  });

  DBHelper.favoriteButtonChange(restaurant.is_favorite);
  section.append(button); //add the button to the li
}

/*
//universal postMethod()
let postMethod = (url, data) => {
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


//Creating the new favorite button

favoriteButton = () => {
  const section = document.getElementById("restaurant-container"); //get the section
  
  let button = document.createElement('input'); //create new input element
  button.setAttribute('type', 'button'); //make this input of type button
  button.setAttribute('id', 'favoriteButton'); //set the id of this input to favoriteButton
  
  section.appendChild(button); //add the button to the section
  
  //fetch - post method function
  
  //read/write to idb
  dbPromise.then(db => {
    return db.transaction('restaurants', 'readwrite')
    .objectStore('restaurants').get(parseInt(DBHelper.getParameterByName('id')));
  }).then(function (obj) {
    if (obj.is_favorite == true) {
      button.value = "Unfavorite restaurant"; //set the initial value of the button
    } else {
      button.value = "Favorite restaurant"; //set the initial value of the button
    }
    
    //when the button is clicked, do this
    button.onclick = function () {
      //if the resturant is currently favorite run this if the restaurant isn't favorite then execute the code in else
      if (obj.is_favorite == true) {
        const postData = {"is_favorite": false}; //data to send to the server
        postMethod(`http://localhost:1337/restaurants/${parseInt(DBHelper.getParameterByName('id'))}`, postData); //use the postMethod function
        
        //idb update the is_favorite entry
        dbPromise.then(function (db) {
          var tx = db.transaction('restaurants', 'readwrite');    
          var store = tx.objectStore('restaurants');
          obj.is_favorite = false; //set the is_favorite to false
          store.put(obj); //update it
          return tx.complete;
        }).then(function () {
          console.log('item updated!');
        });
        
        button.value = "Favorite restaurant"; //change the value of the button
      } else {
        const postData = {"is_favorite": true}; //data to send to the server
        postMethod(`http://localhost:1337/restaurants/${parseInt(DBHelper.getParameterByName('id'))}`, postData); //use the postMethod function
        
        //idb update the is_favorite entry
        dbPromise.then(function (db) {
          var tx = db.transaction('restaurants', 'readwrite');
          var store = tx.objectStore('restaurants');
          obj.is_favorite = true; //set the is_favorite to true
          store.put(obj); //update it
          return tx.complete;
        }).then(function () {
          console.log('item updated!');
        });
        
        button.value = "Unfavorite restaurant"; //change the value of the button
      }
    }
  });
}
favoriteButton(); //calling the function so that it's executed
*/

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    row.tabIndex = "0";
    
    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);
    
    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);
    
    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews  = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
  
}

/**
 * Create review HTML and add it to the webpage.
 */

 //try creating a !navigator.onLine and try to get the data from the local storage. Maybe this'll work.
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.tabindex = "0";
  
  const reviewsBanner = document.createElement('div'); //creating the black banner with Name and date
  reviewsBanner.className = 'reviews-banner'; //giving it a class
  li.appendChild(reviewsBanner); //appending it to the li
  
  const name = document.createElement('p');
  name.className = 'reviews-name';
  name.innerHTML = review.name;
  reviewsBanner.appendChild(name);

  const date = document.createElement('p');
  date.className = 'reviews-date';
  const reviewDate = new Date(review.createdAt);
  date.innerHTML = reviewDate.toDateString();
  reviewsBanner.appendChild(date);
  
  const reviewsInfo = document.createElement('div'); //creating div which contains the rating and comment of the restaurant
  reviewsInfo.className = 'reviews-info'; //giving it a class
  li.appendChild(reviewsInfo); //appending it to the li
  
  const rating = document.createElement('p');
  rating.className = 'rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  reviewsInfo.appendChild(rating);

  if(!navigator.onLine) {
    console.log("offline");
    const offline = document.createElement('p');
    offline.id = 'offlineBadge';
    offline.innerHTML = `Offline`;
    reviewsInfo.appendChild(offline);
  } else {
    //const offlineBadge = document.
    if(document.getElementById('offlineBadge')) {
      reviewsInfo.removeChild(document.getElementById('offlineBadge'));
    }
  }
  
  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  reviewsInfo.appendChild(comments);
  
  li.tabIndex = "0";
  return li;
}

addReviews = () => {
  const submit = document.getElementById("userSubmit"); //get the submit button
  const id = parseInt(DBHelper.getParameterByName('id')); //get the id of the restaurant

  //fetch - post method function
  //read/write to idb
  /*dbPromise.then(db => {
    return db.transaction('reviews', 'readwrite')
    .objectStore('reviews').get(parseInt(DBHelper.getParameterByName('id')));
  }).then(function (obj) {*/
    
    //when the button is clicked, do this
    submit.addEventListener("click", function (event) {
      event.preventDefault();
      const postData = {
        "restaurant_id": id,
        "name": document.getElementById("userName").value,
        "rating": document.getElementById("userRating").value,
        "comments": document.getElementById("userReview").value,
        "createdAt": Date.now(),
        "updatedAt": Date.now()
      };
      //location.reload(); //reload the website after successful POST request

      //idb update the is_favorite entry
      /*dbPromise.then(function (db) {
        var tx = db.transaction('reviews', 'readwrite');
        var store = tx.objectStore('reviews');
        store.put(postData); //update it
        return tx.complete;
      }).then(function () {
        console.log('Review added to idb!');
      });*/

      DBHelper.addNewReview(postData);
      //visually adding to the reviews on the website
      addReviewToPage(postData);
      document.getElementById("userReviewForm").reset();
    });
  //});
}
addReviews();

addReviewToPage = (data) => {
  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML(data));
  /*if(!navigator.onLine) {
    console.log("online");
    const reviewsInfo = document.getElementsByClassName("reviews-info");
    const offline = document.createElement('p');
    offline.id = 'offlineBadge';
    offline.innerHTML = `Offline`;
    reviewsInfo.appendChild(offline);
  }*/
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */

fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  breadcrumb.tabIndex = "0";
  const li = document.createElement('li');
  li.tabIndex = "0";
  li.innerHTML = restaurant.name;
  li.setAttribute("id", "restaurantNameBreadcrumb");
  breadcrumb.appendChild(li);
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}