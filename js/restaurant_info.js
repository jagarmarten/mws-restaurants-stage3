let restaurant;
var map;

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

const dbPromise = idb.open('restaurantsDB', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants', {
        keyPath: 'id'
      });
  }
});

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

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
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
  // fill reviews
  fillReviewsHTML();
}

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

/**
 * Creating the new favorite button
 */
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
    .objectStore('restaurants').get(parseInt(getParameterByName('id')));
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
        postMethod(`http://localhost:1337/restaurants/${parseInt(getParameterByName('id'))}`, postData); //use the postMethod function
        
        //idb update the is_favorite entry
        dbPromise.then(function (db) {
          var tx = db.transaction('restaurants', 'readwrite');    
          var store = tx.objectStore('restaurants');
          obj.is_favorite = false;
          store.put(obj);
          return tx.complete;
        }).then(function () {
          console.log('item updated!');
        });

        button.value = "Favorite restaurant"; //change the value of the button
      } else {
        const postData = {"is_favorite": true}; //data to send to the server
        postMethod(`http://localhost:1337/restaurants/${parseInt(getParameterByName('id'))}`, postData); //use the postMethod function

        //idb update the is_favorite entry
        dbPromise.then(function (db) {
          var tx = db.transaction('restaurants', 'readwrite');
          var store = tx.objectStore('restaurants');
          obj.is_favorite = true;
          store.put(obj);
          return tx.complete;
        }).then(function () {
          console.log('item updated!');
        });

        button.value = "Unfavorite restaurant"; //change the value of the button
      }
    }
  });
}
favoriteButton();
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
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
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
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.tabindex = "0";

  const reviewsBanner = document.createElement('div'); //creating the black banner with Name and date
  reviewsBanner.className = 'reviews-banner'; //giving it a class
  li.appendChild(reviewsBanner); //appending it to the li

  const name = document.createElement('p');
  name.id = 'reviews-name';
  name.innerHTML = review.name;
  reviewsBanner.appendChild(name);

  const date = document.createElement('p');
  date.id = 'reviews-date';
  date.innerHTML = review.date;
  reviewsBanner.appendChild(date);

  const reviewsInfo = document.createElement('div'); //creating div which contains the rating and comment of the restaurant
  reviewsInfo.className = 'reviews-info'; //giving it a class
  li.appendChild(reviewsInfo); //appending it to the li

  const rating = document.createElement('p');
  rating.id = 'rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  reviewsInfo.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  reviewsInfo.appendChild(comments);

  li.tabIndex = "0";
  return li;
}

//
// I'm having a problem with form submission and then reading the data from the DB
//

/*

Every time an user submits the form data, the request goes successfully. The review is added to the indexedDB and server as well. But the problem occurs when I want to add another review. The previous one suddenly gets deleted. What should I do? Thanks

*/

addReviews = () => {
  const submit = document.getElementById("userSubmit");
  const id = parseInt(getParameterByName('id'));

  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]; //an array of each month name
  var currentDate = new Date(); //create a new date obj

  var date = currentDate.getDate(); //get the current date
  var month = currentDate.getMonth(); //get the current month number
  var year = currentDate.getFullYear(); //get the current year

  var dateString = months[month] + " " + date + ", " + year; //concat the date, month and year together - the output is - "Month Date, Year" -> "July 18, 2018"
  //fetch - post method function
  //read/write to idb
  dbPromise.then(db => {
    return db.transaction('restaurants', 'readwrite')
      .objectStore('restaurants').get(parseInt(getParameterByName('id')));
  }).then(function (obj) {

    //when the button is clicked, do this
    submit.addEventListener("click", function (event) {
      event.preventDefault();
      const postData = {
        //"date": dateString
        "restaurant_id": id,
        "name": document.getElementById("userName").value,
        "rating": document.getElementById("userRating").value,
        "comments": document.getElementById("userReview").value
      };

      postMethod(`http://localhost:1337/reviews/`, postData); //use the postMethod function
      
      //idb add review entry (form data)
      dbPromise.then(function (db) {
        var tx = db.transaction('restaurants', 'readwrite');
        var store = tx.objectStore('restaurants');
        obj.reviews = [postData];
        store.put(obj);
        return tx.complete;
      }).then(function () {
        console.log('Review added!');
      });
    })
  });
}
addReviews();
/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  breadcrumb.tabIndex = "0";
  const li = document.createElement('li');
  li.tabIndex = "0";
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}