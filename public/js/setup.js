    // By setting the font-size to 1/100th of the body height,
    // we can use rem as a ghetto-vh. So 100rem means 100% of the body height
    // and we can write all our sizes in terms of the viewport height.
    function setFontSize() {
        $(document.documentElement)
            .css('font-size', $(document.body).height() / 100);
    }

    $(window).resize(setFontSize);
    setFontSize();
