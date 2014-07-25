    // By setting the font-size to 1/100th of the body height,
    // we can use rem as a ghetto-vh. So 100rem means 100% of the body height
    // and we can write all our sizes in terms of the viewport height.
    function setFontSize() {
        $(document.documentElement)
            .css('font-size', $(document.body).height() / 100);
    }

    function resize(elem, size) {
        var increment = 0.25;
        // Set the new 'font-size' before testing
        elem.find('strong').attr('style', 'font-size: ' + size + 'rem;');
        // Resizing again if the right edge of the text is going outside of the box
        if ( (elem.width() + elem.offset().left) < (elem.find('strong').width() + elem.find('strong').offset().left) ) {
            resize(elem, size - increment);
        }
        // Resizing again if the text height is bigger than the box height
        else if (elem.height() < elem.find('strong').height()) {
            resize(elem, size - increment);
        }
    }

    function sortRoomList() {
        var $roomsList = $('#rooms-list');
        var $rooms = $roomsList.children();
        var roomArray = $.makeArray($rooms.detach());
        /*
        roomArray.sort(function(a, b) {
            return $(a).attr('data-name').compareTo($(b).attr('data-name'));
        });
        */
        $(roomArray).appendTo($roomsList);
    }



    $(window).resize(setFontSize);
    setFontSize();

    sortRoomList();

    // Calling the resizing function for this element/row/room (with a starting/max 'font-size' of 10rem)
    var elems = $('li.no-status');
    for (var i = 0; i < elems.length; i++) {
        var $this = $(elems[i]);
        resize($this, 10);
        $this.click(function(e) {
            var target = $( event.target );
            if ( target.is( "strong" ) ) {
                target = target.parent();
            }
            window.location = target.attr('data-link');
            e.stopPropagation();
        });
    }

