'use strict';

var MAP;
var DIRECTION_DISPLAY;
var DIRECTION_SERVICE;
var OPEN_SIDEBAR		  = false;
var USER_MARKER           = null;
var ALL_MARKERS           = []
var CURRENT_USER_LOCATION = null;
var CURRENT_MAP_LOCATION  = null;
var LAST_INFO_WINDOW_OPENED = null;
var autocomplete = null;
var places = null;
var markers = [];

$(document).on('ready', function(){
showUser();

	$('[data-toggle="tooltip"]').tooltip();
	$('[data-toggle="popover"]').popover();

	$('#btn-menu').on('click', showIndex);
	$('#btn-user').on('click', showUser);
	$('#btn-close-sidebar').on('click',closeSideBar);
	$('#btn-show-register').on('click',showRegister);
	$('#btn-show-login').on('click',showLogin);
	$('#btn-show-remind').on('click',showRemind);
	$('#btn-route').on('click',showRoutes);
	$('#btn-contact').on('click',showContact);
	$('.tag-menu').on('click',filterTag);
	$('.btn-foundLocation').on('click', foundLocation);
	$('#submit-editprofile').on('click', submitProfile);
	$("#route-start").select2();
	$("#route-end").select2();

	$('#calculate-route').on('click', function(event) {
		event.preventDefault();
		
		calculateRouteFromPanel();
	});

	$('#calculate-route-without-auth').on('click', function(event) {
		event.preventDefault();
		
		alertify.error("Para poder calcular una ruta, debe estar logeado");
	});

	$('#route-from-my-location').on('click', function(event){
		$('#start-route-container').toggle();
	});

	$('#btn-showAllLocations').on('click', function(event) {
		event.preventDefault();
		showAllLocations();
	});

    $.each($('.ranking'), function(index, value){
    	var currentRanking = $(this).attr('data-ranking');

		$(this).raty({ score: currentRanking, readOnly: true });
    });
});

function initializeApp() {
	
	DIRECTION_SERVICE = new google.maps.DirectionsService();
	DIRECTION_DISPLAY = new google.maps.DirectionsRenderer();

    //Map parametrs
  	var mapOptions = {
        zoom: 6,
        mapTypeId: google.maps.MapTypeId.ROADMAP,

        mapTypeControl: false,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            //position: google.maps.ControlPosition.BOTTOM_RIGHT
        },
        panControl: false,
        panControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT
        },
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        scaleControl: false,
        scaleControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT
        },
        streetViewControl: true,
        streetViewControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        }
    }

    //map
    MAP = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

    DIRECTION_DISPLAY.setMap(MAP);
  	DIRECTION_DISPLAY.setPanel(document.getElementById('routes-directions-panel'));

 	google.maps.event.addListener(MAP, "rightclick",function(event){showContextMenu(event.latLng)});
 	google.maps.event.addListener(MAP, "click",function(event){closeAllInfoWindow()});

    setLocationInit();
    setMarkers();

	autocomplete = new google.maps.places.Autocomplete(
		/** @type {HTMLInputElement} */(document.getElementById('input-search')),
		{
			types: ['(cities)'],
			componentRestrictions: {'country': 'ar'}
		});
	places = new google.maps.places.PlacesService(MAP);

	google.maps.event.addListener(autocomplete, 'place_changed', onPlaceChanged);
}

function showContextMenu(currentMapLocation) {
	var contextmenuDir;
	var projection = MAP.getProjection() ;

	//CURRENT_MAP_LOCATION = {lat:location.coords.latitude, lng:location.coords.longitude};

	$('.contextmenu').remove();
	contextmenuDir = document.createElement("div");
    contextmenuDir.className  = 'contextmenu';
    contextmenuDir.innerHTML = '<ul class="dropdown-menu" role="menu" style="display:block !important;">'
							+  '<li><a onClick="foundMe()" id="contextmenu-btn-search-me" href="#"><i style="cursor:pointer" class="fa fa-binoculars"></i>&nbsp; Buscar mi posición</a></li>'
							+ '<li><a onClick="calculateRouteFromMap()" id="contextmenu-btn-calculate-route" href="#"><i style="cursor:pointer" class="fa fa-road"></i>&nbsp; Calcular Ruta desde mi ubicación</a></li>'
							+ '</ul>';

 	$(MAP.getDiv()).append(contextmenuDir);

 	$('.contextmenu').on('mouseleave', function(){
 		removeContextMenu();
 	});

 	$('.contextmenu').on('click', function(){
 		removeContextMenu();
 	});

 	setMenuXY(currentMapLocation);

 	contextmenuDir.style.visibility = "visible";
}

function removeContextMenu()
{
	$('.contextmenu').remove();
}

function getCanvasXY(caurrentLatLng){
    var scale 	= Math.pow(2, MAP.getZoom());
    var nw 		= new google.maps.LatLng(
        MAP.getBounds().getNorthEast().lat(),
        MAP.getBounds().getSouthWest().lng()
    );
      
    var worldCoordinateNW 		= MAP.getProjection().fromLatLngToPoint(nw);
    var worldCoordinate 		= MAP.getProjection().fromLatLngToPoint(caurrentLatLng);
    var caurrentLatLngOffset 	= new google.maps.Point(
        Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
        Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
    );
    
    return caurrentLatLngOffset;
}

function setMenuXY(caurrentLatLng){
    var mapWidth = $('#map_canvas').width();
    var mapHeight = $('#map_canvas').height();
    var menuWidth = $('.contextmenu').width();
    var menuHeight = $('.contextmenu').height();
    var clickedPosition = getCanvasXY(caurrentLatLng);
    var x = clickedPosition.x ;
    var y = clickedPosition.y ;

    if((mapWidth - x ) < menuWidth) {
        x = x - menuWidth;
    }
    
    if((mapHeight - y ) < menuHeight){
        y = y - menuHeight;
    }

    $('.contextmenu').css('left',x - 5);
    $('.contextmenu').css('top',y - 5);
};

function addLoading(selector, loaderContainerId) {

	$(selector).html('<p id="' + loaderContainerId + '" class="text-center"><img src="./app/img/ajax-loader.gif" /><br>Cargando...</p>');	

}

function hideLoading() {
	$('#loader-container').hide();
}

function filterTag(e) {
	e.preventDefault();

	$('.tag-menu').removeClass('tag-active');
	$(this).addClass('tag-active');

	if($(this).attr('data-id') != 0) {
		getChildrenTags($(this).attr('data-id'));
	}	
}

function closeAllInfoWindow() {
	$.each(ALL_MARKERS, function(index, value){
		value.marker.infowindow.close();
	});
}

function foundMe() {
	MAP.setCenter(new google.maps.LatLng(CURRENT_USER_LOCATION.lat, CURRENT_USER_LOCATION.lng));

	if(USER_MARKER != null) {
		USER_MARKER.infowindow.open(MAP,USER_MARKER);
	}

	MAP.setZoom(13);
	closeAllInfoWindow();
	closeSideBar();
}

function showLocationOnMap(id) {
	$.each(ALL_MARKERS, function(index, value){

		var marker = value.marker;		
		marker.infowindow.close();

		if(value.data.id == id) {			
			MAP.setCenter(marker.getPosition());
			marker.infowindow.open(MAP, marker);
			setLastInfoWindowOpened(marker.infowindow);
			centerMarker(value.data);
		} 
	});

	closeSideBar();
}

function foundLocation(event) {
	event.preventDefault();

	var id = $(this).attr('data-id');

	showLocationOnMap(id);
}

function showIndex() {
	showSideBar(350, $('#index-content'));
}

function showRoutes() {
	showSideBar(600, $('#routes-content'));
}
function showContact() {
	showSideBar(600, $('#contact-content'));
}

function showChildrenTagContainer() {
	$('#all-points').hide();
	$('#filter-points').hide();
	$('#children-tag-content').show();
}

function showFilterPointsContainer (){
	$('#children-tag-content').hide();
	$('#filter-points').show();
}

function showAllLocations() {
	$('#children-tag-content').hide();
	$('#filter-points').hide();
	$('#all-points').show();	
	showAllMarkers();
}

function showLocationDetail() {
	showSideBar(600, $('#location-content'));
}

function showUser() {
	var userContent = $('#user-content');

	if(userContent.length > 0) {
		showSideBar(600, $('#user-content'));
	} else {
		showSideBar(600, $('#profile-content'));
	}		
}

function showRegister(event) {
	event.preventDefault();
	$('.sidebar-content').hide();
	$('#register-content').show();
}

function showLogin(event) {
	event.preventDefault();
	$('.sidebar-content').hide();
	$('#user-content').show();
}
function showRemind(event) {
	event.preventDefault();
	$('.sidebar-content').hide();
	$('#remind-content').show();
}

function showSideBar(leftValue, objectContent) {
	hideLastInfoWindowsOpened();
	$('#sidebar').css("width",leftValue + 'px');
	$('#sidebar').css("max-width", '90%');
	$('#main-menu').css("left",'0px');
	$('.sidebar-content').hide();

	if(OPEN_SIDEBAR == true) {
		$('#sidebar').removeClass("open-sidebar").delay(260).queue(function(next){

	    	$(this).addClass("open-sidebar").delay(100).queue(function(next){
	    		objectContent.show();
	    		next();
	    	});

	    	next();
		});
	} else {
		$('#sidebar').addClass("open-sidebar").delay(100).queue(function(next){
    		objectContent.show();
    		next();
    	});

		OPEN_SIDEBAR = true;
	}
}

function closeSideBar() {
	$('#sidebar').removeClass('open-sidebar');
	OPEN_SIDEBAR = false;
}

function setMarkers() {
	$.each(ALL_LOCATIONS, function( index, value ) {
		console.log(value.id);
		addMarker(index, value);	
	});
}
function getLocationImages(id){
	var images = [];
		$.each(ALL_LOCATIONS_IMG, function( index, value ) {
			if(id == value.id && value.image != null && value.image != ''){
				images.push(value.image);
			}		
		});
	return images;
}
var images= [];
function addMarker(index, value) {
	var icon   = './app/img/icon/' + value.marker;
console.log(value.marker);
  	var contentString = '<div class="window-content">'+
  	'<strong>' + value.name + '</strong>' +
  	'<hr>';
	images = getLocationImages(value.id);
	var oneimage;

	var count = 0;
	if(images.length > 0) {
		console.log('hola');
		$.each(images, function( index, image) {
		// crear funcion que pasando el value.id me devuelve todas las imagenes
		  	
				
				if(count == 0 ){
					contentString += '<a href="assets/images/location/' + image + '" data-lightbox="image-1"><img src="assets/images/location/' + image + '"  width="100%" /></a>';		
				}
				else{
					contentString += '<a href="assets/images/location/' + image + '" data-lightbox="image-1"></a>';		

				}
			
		  		
		  	
			count ++;
			oneimage = image;
		});
	
	}else {
		console.log('hola');
	  		contentString += '<img src="./app/img/no-image.png"  width="100%" /><br>';	  		
	}		

  	contentString += '<a href="assets/images/location/' + oneimage + '" data-lightbox="image-1" id="link-show-location-detail" class=" link-info"><i class="fa fa-picture-o"></i>&nbsp;Ver todas las imagenes</a><br>' +'<a href="#" id="link-calculate-route-'+value.id+'" onclick="calculateRouteFromMarker(' +value.id+ ', '+ value.lng +', '+ value.lat +')" class=" link-info"><i class="fa fa-road"></i>&nbsp;Calcular ruta desde mi posición</a><br>' +
  	'<a href="#"  id="link-show-location-detail" onclick="getInfoLocation(' +value.id+ ')" class=" link-info"><i class="fa fa-plus"></i>&nbsp;Ver más información</a><br>' +
    + '</div>';

	var infowindow = new google.maps.InfoWindow({
	    content: contentString,
	    zIndex: 99999,
	    masWidth: 300
	});

	var marker = new google.maps.Marker({
  		position: new google.maps.LatLng(value.lat, value.lng),
  		map: MAP,
  		title: value.name,
  		category: icon,
  		data: value,
  		icon: icon,
  		infowindow: infowindow
	});

  	google.maps.event.addListener(marker, 'click', function() {
  		hideLastInfoWindowsOpened();
  		infowindow.open(MAP,marker);
  		setLastInfoWindowOpened(infowindow);
  		closeSideBar();
  		centerMarker(value);
  	});

  	ALL_MARKERS.push({data:value, marker:marker});
}

function centerMarker(data) {
	var lat = data.lat + 5;
	var lng = data.lng ;

	setCenterLocation(lat, lng);
}

function hideLastInfoWindowsOpened() {
	if(LAST_INFO_WINDOW_OPENED != null) {
		LAST_INFO_WINDOW_OPENED.close();
	}
}


function setLastInfoWindowOpened(infoWindow) {
	LAST_INFO_WINDOW_OPENED = infoWindow;
}

function hideAllMarker() {
	$.each(ALL_MARKERS, function(index, value) {
		value.marker.setMap(null);
	});
}

function showAllMarkers() {
	$.each(ALL_MARKERS, function(index, value) {
		value.marker.setMap(MAP);
	});
}

function showFilterMarkers(filter) {
	hideAllMarker();

	$.each(ALL_MARKERS, function(index, value) {
		if($.inArray(value.data.id, filter) >= 0) {
			value.marker.setMap(MAP);
		}
	});
}

function toggleBounce() {

  if (marker.getAnimation() != null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
  }
}

function getInfoLocation(id) {
	addLoading('#location-content', 'loader-container');
	$('#location-content').load('./' + id + '/location-info', function(){
		var currentRanking = $('#ranking').attr('data-ranking');
		var readOnly 	   = $('#ranking').attr('data-readonly');

    	if(readOnly) {
    		$('#ranking').raty({ score: currentRanking, click: vote, readOnly: true });
    		$('#ranking').on('click', function(){
    			alertify.error("Para poder calificar el punto interactivo, debe estar logeado.");
    		});
    	} else {
    		$('#ranking').raty({ score: currentRanking, click: vote});
    	}
		
	});
	showLocationDetail();
}

function vote(score, evt) {
	
	var locationId = $('#ranking').attr('data-location-id');

	$.ajax({
		type: "POST",
		url: 'http://codedoors.com/naturaleza-argentina/public/ranking',
		data: {ranking: score, location_id: locationId},
		success: function (){
			alertify.success("Su votación se ha realizao con éxito, gracias por participar.");
			$('#ranking').raty({ score: score,  readOnly: true });
		},
		dataType: 'json'
	});
}

function sendComment(comment, locationId) {

	$('#btn-comment').hide();
	$('#load-comment').show();
	addLoading('#load-comment', '');


	$.ajax({
		type: "POST",
		url: 'http://codedoors.com/naturaleza-argentina/public/comment',
		data: {comment: comment, location_id: locationId},
		success: function (data){
			console.log("HOLA");
			$('#load-comment').hide();

			switch(data.success) {
				case true:
					alertify.success("Su comentario se ha realizao con éxito, gracias por participar.");
					$('#input-comment').attr('disabled', 'disabled');
					break;
				case false:
					$('#btn-comment').show();
					alertify.error("Su comentario no se ha podido realizar, por favor intente más tarde.");
					break;
				default:
					$('#btn-comment').show();
					alertify.error("Su comentario no se ha realizado, debido a que ha utilizado palabras inadecuadas, por favor modifique su comentario.");
			}
		},
		dataType: 'json'
	});
}

function getChildrenTags(id) {
	addLoading('#children-tag-content', 'loader-container');
	

	$('#children-tag-content').load('./' + id + '/children-tag');
	showChildrenTagContainer();
}

function getChildrenLocations(childrenTagId) {
	addLoading('#filter-points', 'loader-container');
	$('#filter-points').load('./' + childrenTagId + '/children-location');
	showFilterPointsContainer();
}

function setLocationInit() {

    var geolocation = navigator.geolocation;

    if(geolocation) {
       geolocation.getCurrentPosition(setUserLocation, setArgentinaLocation);
    } else {
        setArgentinaLocation();
    }
}

function setUserLocation(location) {
	CURRENT_USER_LOCATION = {lat:location.coords.latitude, lng:location.coords.longitude};

	var contentString = '<div class="window-user-content"><strong><i class="fa fa-user"></i>&nbsp; Ustede se encuentra aqui</strong></div>';

    var infowindow = new google.maps.InfoWindow({
	    content: contentString,
	    zIndex: 99999,
	});

	var marker = new google.maps.Marker({
  		position: new google.maps.LatLng(CURRENT_USER_LOCATION.lat, CURRENT_USER_LOCATION.lng),
  		map: MAP,
  		title: 'Su ubicación',
  		value:{id:0},
  		infowindow: infowindow
	});


	google.maps.event.addListener(marker, 'click', function() {
  		hideLastInfoWindowsOpened();
  		infowindow.open(MAP,marker);
  		setLastInfoWindowOpened(infowindow);
  		closeSideBar();
  	});

    setCenterLocation(CURRENT_USER_LOCATION.lat, CURRENT_USER_LOCATION.lng);
    USER_MARKER = marker;
}

function setArgentinaLocation() {
    var argentina  = {lat:-38.1477868, lng:-62.9157204};

    setCenterLocation(argentina.lat, argentina.lng);
}

function setCenterLocation(lat, lng) {
    var location = new google.maps.LatLng(lat, lng);

    MAP.setCenter(location);
}

function calculateRouteFromPanel() {
	var fromMyLocation    = $('#route-from-my-location').is(":checked");
	var start 		  	  = document.getElementById('route-start').value;
  	var end   		  	  = document.getElementById('route-end').value;

	if(fromMyLocation == true) { 		
		start = CURRENT_USER_LOCATION.lat + ',' +CURRENT_USER_LOCATION.lng;
	}

  	if(start == 0 || end == 0) {
  		alertify.error("Para calcular una ruta debe seleccionar desde y hasta, por favor intente nuevamente.");
  		hideLoading();
  		return false;
  	}

  	calculateRoute(start, end);
}

function calculateRouteFromMap() {

	if($('#route-from-my-location').is(':checked') == false) {
		$('#route-from-my-location').trigger('click');
	}

	showRoutes();
}

function calculateRouteFromMarker(linkId, lng, lat) {

	var link = $('link-calculate-route-' + linkId);

	if($('#route-from-my-location').is(':checked') == false) {
		$('#route-from-my-location').trigger('click');
	}

    $('#route-end').val(lat+ ',' +lng).trigger("change");
    $('#calculate-route').trigger('click');

	showRoutes();
}

function showRoutePanel() {
	addLoading('#routes-directions-panel', 'loader-container');
	$('#route-fieldset-container').show();
}

function calculateRoute(start, end) {
	hideLastInfoWindowsOpened();
	showRoutePanel();

    var travelMode 		= google.maps.TravelMode.DRIVING;
    var unitSystemType	= google.maps.UnitSystem.METRIC;

  	var request = {
    	origin: start,
    	destination: end,
    	travelMode: travelMode,
    	unitSystem: unitSystemType
  	};
  	  	console.log("MY REQUEST");

  	console.log(request);
  	DIRECTION_SERVICE.route(request, function(response, status) {
  		console.log("STATUS");
  		console.log(status);
    	if (status == google.maps.DirectionsStatus.OK) {
      		DIRECTION_DISPLAY.setDirections(response);
      		hideLoading()
    	} else {
    		alertify.error("No se ha podido calcular la ruta especificada, por favor comuniquese con el administrador");
    		hideLoading()
    	}
  	});

  	$('#view-route-map').show();
}


/* SEARCH BY CITY */
// When the user selects a city, get the place details for the city and
// zoom the map in on the city.
function onPlaceChanged() {
	var place = autocomplete.getPlace();
	if (place.geometry) {
		MAP.panTo(place.geometry.location);
		MAP.setZoom(11);
		search();
	} else {
		document.getElementById('input-search').placeholder = 'Buscar por ciudad';
	}

}

// Search for hotels in the selected city, within the viewport of the map.
function search() {
	showAllLocations();
}

function submitProfile (e) {

	$('#form-editprofile').submit();
	addLoading('#modal-edit-profile .modal-body', 'loader-container');
}