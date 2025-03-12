var touchStartX = 0;
var isPinching = false;
var swipeThreshold = 75; // if you moved less than this number then it's a not a swipe

//Record the 'x' location of were the user first touched	
function anmo_kai(evt) {

    if (evt && evt.touches && evt.touches.length > 1) {
        isPinching = true;
    }
    else {
        isPinching = false;
        touchStartX = evt.touches[0].clientX;
    }
}

// Determine if the user swiped left or right
function anmo_wan(evt) {
    var swipeX = 0; // will hold the distance the user swiped

    // Check for a pinch
    if (isPinching)
        return;

    // Verify there are touch events
    if (evt && evt.changedTouches) {
        //Compare the X where the first touch was done, when the X location now. 
        swipeX = evt.changedTouches[0].clientX - touchStartX;
    }

    if (Math.abs(swipeX) > swipeThreshold) {
        if (swipeX < 0) {
            displayPrev();
        }
        else {
            displayNext();
        }
    }
}