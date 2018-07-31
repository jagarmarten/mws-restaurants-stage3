let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {

  //using the image lazy loading plugin
  echo.init({
    offset: 100,
    throttle: 250,
    unload: false,
    callback: function (element, op) {
      console.log(element, 'has been', op + 'ed')
    }
  });

  const li = document.createElement('li');
  li.tabIndex = "0";
  li.className = "restaurant-selection";

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.alt = restaurant.name;
  image.title = restaurant.name + " restaurant";
  image.src = "";
  //image.src = DBHelper.imageUrlForRestaurant(restaurant) + "-lazy.jpg";
  image.setAttribute('data-echo', DBHelper.imageUrlForRestaurant(restaurant) + ".jpg");
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);
  
  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);
  
  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);
  
  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.tabIndex = "0";
  more.className = "restaurant-selection-button";
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  //function for faster class exchange
  exchangeClass = (element, oldClass, newClass) => {
    element.classList.remove(oldClass); //removing a class
    element.classList.add(newClass); //adding a class
  }

  //creating the favorite button as an input
  let button = document.createElement('input'); //create new input element
  button.setAttribute('type', 'button'); //make this input of type button
  button.classList.add("button-favorite"); //adding it a class with which I can control in in .css file
  button.value = "❤"; //adding it a value - a heart is a common symbol used
  //adding an event listener which watches for whether the button was clicked
  button.addEventListener("click", function() {
    DBHelper.favoriteButtonUpdate(restaurant.id, !restaurant.is_favorite); //using the function from DBHelper to PUT to the server
    restaurant.is_favorite = !restaurant.is_favorite; //assigning it an opposite value - from true to false and from false to true
    //if the restaurant is favorite, then to this and if it isn't than do that. This is a newer version of the code which is shorter but in the restaurant_info.js is a longer version which is commented out.
    if(restaurant.is_favorite) {
      button.setAttribute("aria-label", "Remove this restaurant as your favorite"); //adding it a aria label
      exchangeClass(button, "favorite-false", "favorite-true"); //remove favorite-false class and add a favorite-true class
      console.log("Changed to true"); //printing in console
    } else {
      button.setAttribute("aria-label", "Set this restaurant as your favorite"); //adding it a aria label
      exchangeClass(button, "favorite-true", "favorite-false"); //remove favorite-true class and add a favorite-false class
      console.log("Changed to false"); //printing in console
    }
  });
  //this code is used normally, without the button being pressed
  //if the restaurant is favorite, then to this and if it isn't than do that. This is a newer version of the code which is shorter but in the restaurant_info.js is a longer version which is commented out.
  if (restaurant.is_favorite) {
    button.setAttribute("aria-label", "Remove this restaurant as your favorite"); //adding it a aria label
    exchangeClass(button, "favorite-false", "favorite-true"); //remove favorite-false class and add a favorite-true class
    console.log("Changed to true"); //printing in console
  } else {
    button.setAttribute("aria-label", "Set this restaurant as your favorite"); //adding it a aria label
    exchangeClass(button, "favorite-true", "favorite-false"); //remove favorite-true class and add a favorite-false class
    console.log("Changed to false"); //printing in console
  }
  li.append(button); //add the button to the li

  return li; //returning the li
}


/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}