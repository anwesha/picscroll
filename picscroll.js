$(function() {

    /*
     * Constants
     */
    var GALLERY_URLS = {
            NIGHT_SHOTS : 'https://www.flickr.com/photos/flickr/galleries/72157647613641977/',
            DIY         : 'https://www.flickr.com/photos/flickr/galleries/72157653519867173/',
            REFLECTED   : 'https://www.flickr.com/photos/flickr/galleries/72157653248099894/',
            PEAKS       : 'https://www.flickr.com/photos/flickr/galleries/72157646472797634/',
            SUNRISE     : 'https://www.flickr.com/photos/flickr/galleries/72157648167050332/'
        },
        METHOD_NAMES = {
            LOOKUP_GALLERY : 'flickr.urls.lookupGallery',
            GET_PHOTOS     : 'flickr.galleries.getPhotos'
        },
        TYPE = {
            FIXED : 'fixedSize',
            FLEX  : 'flexSize'
        };


    /*
     * Pic gallery widget
     * @description scrollable gallery of flickr photos
     */
    var PicGallery = function (config) {
        config           = config || {};
        var self         = this;
        self.gallery_url = config.gallery_url || GALLERY_URLS.NIGHT_SHOTS;
        self.api_key     = config.api_key || '6744859c20b9f3a0883839bd8b528e65';
        self.type        = config.type || 'fixedSize';
        self.parent_id   = config.parent_id;
    };

    PicGallery.prototype = {
        init: function () {
            var self = this;

            $(self.parent_id + ' .pic-scroll-cont')
            .addClass(self.type === TYPE.FIXED ? 'fixed-size' : 'flex-size');

            self._getGalleryId()
            .then(self._getGalleryPhotos.bind(self))
            .then(self._getPhotos.bind(self))
            .then(self._buildPicScroll.bind(self));
        },

        /*
         *  @method _buildFlickrUrl
         *  @desc   merges params if passed and constructs the correct flickr api url for ajax requests
         *  @params {Object} key value pairs of query params
         *  @return {String} contstructed flickr url
         */
        _buildFlickrUrl: function (params) {
            var self        = this,
                baseUrl     = 'https://api.flickr.com/services/rest/',
                queryParams = {
                    'api_key': self.api_key,
                    'format' : 'json',
                    'nojsoncallback': '1'
                };
            $.extend(queryParams, params);
            return baseUrl + '?' + $.param(queryParams);
        },


        /*
         * @method _getGalleryId
         * @desc   makes an ajax call to lookup gallery id from a gallery url
         * @return {String} Gallery Id
         */
        _getGalleryId: function () {
            var self   = this,
                params = {
                    'method': METHOD_NAMES.LOOKUP_GALLERY,
                    'url'   : self.gallery_url
                };

            return $.ajax({
                url: self._buildFlickrUrl(params)
            });
        },


        /*
         * @method _getGalleryPhotos
         * @desc   makes an ajax call to get photos from the gallery
         * @return {Object} photos object
         */
        _getGalleryPhotos: function (galleryInfo) {
            var self       = this,
                galleryId  = galleryInfo && galleryInfo.gallery && galleryInfo.gallery.id;
                params     = {
                    'method'       : METHOD_NAMES.GET_PHOTOS,
                    'gallery_id'   : galleryId,
                    'per_page'     : 10
                };

            if (!galleryId) {
                return;
            }

            return $.ajax({ 
                url: self._buildFlickrUrl(params)
            });
        },


        /*
         * @method _getPhotos
         * @desc   parses the galleries photos object and builds photo urls
         * @params {Object} list of photo information
         * @return {Object} array of photos
         */
        _getPhotos: function (photosData) {
            var photos    = photosData && photosData.photos,
                photosArr = photos && photos.photo || [];

            if (photosArr && photosArr.length > 1) {
                photosArr = photosArr.slice(0,10);
                photosArr = photosArr.map(function (photo) {
                    var photoUrl = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server
                                 + '/' + photo.id + '_' + photo.secret + '_z.jpg';
                    return {
                        url : photoUrl,
                        id  : photo.id,
                        title: photo.title,
                        buddyIcon : 'http://flickr.com/buddyicons/' + photo.owner + '.jpg'
                    };

                });
            }

            return photosArr;
        },


        /*
         * @method _setItemWidth
         * @desc   utility function to calculate the width of a gallery item
         */
        _setItemWidth: function () {
            var self        = this;
                itemWidth   = $(self.parent_id + ' .pic-holder li').css('width').slice(0,-2);
            self.itemWidth = itemWidth && parseInt(itemWidth, 10);
        },


        /*
         * @method _getCurIndex
         * @desc   utility function to find the index of the current item in the gallery
         */
        _getCurIndex: function () {
            var self     = this,
                curNode  = $(self.parent_id + ' .pic-holder .cur'),
                curIdx   = curNode && curNode.data('idx');
            return curIdx;
        },


        /*
         * @method _controlClickHandler
         * @desc   handle clicks on prev/next controls
         */
        _controlClickHandler: function () {
            var self        = this,
                prevCtrl    = $(self.parent_id + ' .ctrls.prev'),
                nextCtrl    = $(self.parent_id + ' .ctrls.next'),
                picHolder   = $(self.parent_id + ' .pic-holder');

            self._setItemWidth();

            // go to prev/next photo depending upon which control is clicked
            $(self.parent_id + ' .ctrls').on('click', function (e) {
                var target      = $(e.target),
                    left        = picHolder.css('left').slice(0,-2),
                    dir         = target.hasClass('prev') ? 'prev' : 'next',
                    curNode     = picHolder.find('.cur'),
                    curIdx      = self._getCurIndex(),
                    newIndex    = dir === 'prev' ? curIdx - 1 : curIdx + 1,
                    newLeft     = '-' + newIndex * self.itemWidth + 'px',
                    newNode     = picHolder.find('[data-idx="' + newIndex + '"]'),
                    prevFunc    = newIndex > 0 ? 'removeClass' : 'addClass',
                    nextFunc    = newIndex < self.numOfPhotos - 1 ? 'removeClass' : 'addClass';

                if (curNode) {
                    curNode.removeClass('cur');
                }

                if (newNode) {
                    newNode.addClass('cur');
                }

                prevCtrl[prevFunc]('hide');
                nextCtrl[nextFunc]('hide');
                picHolder.css('left', newLeft);
            });
        },


        /*
         * @method _windowResizeHandler
         * @desc   handle any changes we need to on window resize
         */
        _windowResizeHandler: function () {
            var self        = this,
                _onResize   = function () {
                    var curIdx    = self._getCurIndex(),
                        picHolder = $(self.parent_id + ' .pic-holder'),
                        adjustedLeft;

                    self._setItemWidth();
                    adjustedLeft = '-' + curIdx * self.itemWidth + 'px'

                    picHolder.css('left', adjustedLeft);
                };

            // we dont need any resize handler for fixed galleries
            if (self.type === TYPE.FIXED) {
                return;
            }

            $(window).on('resize', _onResize.bind(self));
        },


        /*
         * @method _buildPicScroll
         * @desc   builds a scrollable photo slideshow
         * @params {Array} array of photo objects
         */
        _buildPicScroll: function (photosArr) {
            var self          = this,
                listItems     = '',
                buildPhotoLis = function  (p, idx) {
                    var className = 'p-item ' + (idx === 0 ? 'cur' : '');
                        bgImg     = 'style="background-image:url(' + p.url + ');"';
                        icon      = '<i class="buddy-icon" style="background-image:url('
                                    + p.buddyIcon + ');"></i>',
                        title     = '<div class="ov">' + icon + '<p class="title">' 
                                    + p.title + '</p></div>';

                    return '<li class="' + className +'" alt="' + p.title + '"'
                           + bgImg + ' data-idx="' + idx + '">' + title + icon + '</li>'; 
                };

            self.numOfPhotos = photosArr.length;

            // build photo item markup
            photosArr.forEach(function (photo, idx) {
                listItems += buildPhotoLis(photo, idx);
            });

            // append the photos to the dom
            // TODO : think about post loading images
            $(self.parent_id + ' .pic-holder').html(listItems);

            self._controlClickHandler();
            self._windowResizeHandler();
        }
    };


    // create picture galleries
    var fixedConfig = {
            gallery_url : GALLERY_URLS.REFLECTED,
            parent_id   : '#fixed-type-cont'
        },
        flexConfig = {
            gallery_url: GALLERY_URLS.SUNRISE,
            parent_id  : '#flex-type-cont',
            type       : 'flexType'
        }; 

    new PicGallery(fixedConfig).init();
    new PicGallery(flexConfig).init();

});