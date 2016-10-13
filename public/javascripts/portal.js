var today = new Date();
var day = today.getDate();
day ='#tanggal' + day;

var $tableParent;
var $dayElement;
var $dayPos;
$(document).ready(function() {
    var numFieldTrx = 1;
    $(".button-collapse").sideNav();
    $('.collapsible').collapsible(
        {hover: true}
    );
    $('select').material_select();
    $("#btnAddTrx").click(function () {
        $("#trxBlock").append('' +
            '<div class="input-field col s2 addedTrx'+ numFieldTrx +'">' +
                '<input name="transactions['+ numFieldTrx +'][trx]" id="trx'+ numFieldTrx +'" type="text" class="validate">' +
                '<label for="trx'+ numFieldTrx +'">Trx</label>' +
            '</div>' +
            '<div class="input-field col s4 addedTrx'+ numFieldTrx +'">' +
                '<input name="transactions['+ numFieldTrx +'][phone]" id="phone'+ numFieldTrx +'" type="text" class="validate">' +
                '<label for="phone'+ numFieldTrx +'">No. Telp</label>' +
            '</div> ' +
            '<div class="input-field col s3 addedTrx'+ numFieldTrx +'"> ' +
                '<select name="transactions['+ numFieldTrx +'][untuk]" id="untuk'+ numFieldTrx +'"> ' +
                    '<option value="1">Kedoya</option> ' +
                    '<option value="2">Biak</option> ' +
                '</select> ' +
                '<label>Untuk : </label> ' +
            '</div>' +
            '<div class="col s3 mb-50 addedTrx'+ numFieldTrx +'" name="addedTrx'+ numFieldTrx +'">' +
                '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
            '</div>');
        $('select').material_select();
        numFieldTrx++;

        $('[name^=btnRemTrx]').click(function () {
            var numToRem = $(this).attr('id');
            var elm = ".addedTrx"+ numToRem;

            console.log(elm);

            $(elm).remove();
        });
    });

    //scrolling tabble

    $dayElement = $(day);
    $dayPos = $dayElement.position();

    var $homeTable = $('.home-table table');
    $tableParent = $homeTable.parent();

    var $table = $('.auto-scroll');
    if ($table.length > 0) {
        $.each($table, function () {
            var $self = $(this);
            var $parent = $self.parent();
            var width = $parent.outerWidth(true);
            var scrollSpeed = 50;
            $parent.css({
                overflow: 'auto'
            });

            $self.mousemove(function (e) {
                if (e.pageX >= $parent.offset().left && e.pageX <= $parent.offset().left + 100) {
                    $parent[0].scrollLeft -= scrollSpeed;
                } else if (e.pageX >= $parent.offset().left + width - 100 && e.pageX <= $parent.offset().left + width) {
                    $parent[0].scrollLeft += scrollSpeed;
                }
            });
        });
    }

    if ($homeTable.length > 0) {
        $.each($table, function () {
            $tableParent.scrollLeft($dayPos.left - (($tableParent.outerWidth(true) / 2) - ($dayElement.outerWidth(true) / 2)));
        });
    }

    var inputListGroup = $('.inputListGroup');
    var listGroup = $('.listGroup');
    var tbody = $('tbody');

    inputListGroup.hide();
    inputListGroup.attr("disabled", true);

    listGroup.click(function () {
        tbody.find('span').show();
        tbody.find('input').hide();
        tbody.find('input').attr("disabled", true);
        tbody.find('input').removeClass('blue-text');
        $(this).children('span').hide();
        $(this).children('input').show();
        $(this).children('input').addClass('blue-text');
        $(this).parent().children('td').children('input').attr("disabled", false);
    });

    inputListGroup.change(function(){
        $('#formListGroup').submit();
    });
});