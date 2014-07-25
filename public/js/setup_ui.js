    // By setting the font-size to 1/100th of the body height,
    // we can use rem as a ghetto-vh. So 100rem means 100% of the body height
    // and we can write all our sizes in terms of the viewport height.
    function setFontSize() {
        $(document.documentElement)
            .css('font-size', $(document.body).height() / 100);
    }

    var resize = function(elem, startSize, currentSize, minSize) {
        // If not reached the minimal size allowed - continue to decrease the size
        if (currentSize >= minSize) {
            var increment = 0.25;
            // Set the new 'font-size' before testing
            elem.find('strong').attr('style', 'font-size: ' + currentSize + 'rem;');
            // Resizing again if the right edge of the text is going outside of the box
            if ( (elem.width() + elem.offset().left) < (elem.find('strong').width() + elem.find('strong').offset().left) ) {
                resize(elem, startSize, currentSize - increment, minSize);
            }
            // Resizing again if the text height is bigger than the box height
            else if (elem.height() < elem.find('strong').height()) {
                resize(elem, startSize, currentSize - increment, minSize);
            }
        } else { // If minSize reached - take the first half of the text & resize it from the beginning
            var text = elem.find('strong').text();
            text = text.substring(0, Math.round(text.length / 2));
            elem.find('strong').text(text + '...');
            resize(elem, startSize, startSize, minSize);
        }
    }

    function sortRoomList() {
        var $roomsList = $('#rooms-list');
        var $rooms = $roomsList.children();
        var roomArray = $.makeArray($rooms.detach());
        roomArray.sort(function(a, b) {
            return $(a).attr('data-name').localeCompare($(b).attr('data-name'));
        });
        $(roomArray).appendTo($roomsList);
    }

    $(window).resize(setFontSize);
    setFontSize();

    sortRoomList();

    // Calling the resizing function for this element/row/room (with a starting/max 'font-size' of 10rem)
    $('li.no-status').click(function() {
        window.location = $(this).attr('data-link');
    }).each(function() {
        resize($(this), 10, 10, 4);
    });
