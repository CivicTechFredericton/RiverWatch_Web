$(document).ready( function() {
	setupLang();
	setupIntro();
	setupNav();
	setupLegend();
});

function setupLang() {
	$('#lang div').on('click', function() {
		if ($(this).hasClass('fr')) {
			$('body').removeClass('fr').addClass('en');
		} else {
			$('body').removeClass('en').addClass('fr');
		}
	});
}

function setupIntro() {
	$('.close').on('click', function() {
		$(this).parents('section').first().addClass('hide');
	});
}

function setupNav() {
	$('.dropdown').on('click', function() {
		$(this).toggleClass('open');
	});
	
	$('#nav-sort li').on('click', function() {
		sortList($('#station-list'), $(this));
	});
}


function sortList(list, link) {
	var sortOn = link.data('sort');
	link.siblings().removeClass('sel');
	link.addClass('sel');
	$('li', list).sort(sort_li).appendTo(list);
  function sort_li(a, b) {
    return ($(b).data(sortOn)) < ($(a).data(sortOn)) ? 1 : -1;
  }
}

function setupLegend() {
	$('#legend').on('click', function() {
		if ($(window).width() <= 640) {
			$(this).toggleClass('open');
		}
	});
}