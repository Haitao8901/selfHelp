$(function () {
    loadTargetPage("welcome_new");
    window.onbeforeunload = function(){
        console.log('close window.');
        shStore.closeWindow = true;
        if(shStore.visitWS){
            try{
                shStore.visitWS.close();
            }catch (e) {
                console.log("Error happened when close webSocket.");
            }
            shStore.visitWS = null;
        }
    }

    //监听按键
    $('body').on('keydown', function(e){
        var which = e.which || e.keyCode;
        if(which == 122) {
            e.preventDefault();
            e.stopPropagation();
        }
        if(which == shStore.fullScreenKey) {
            if(!shStore.fullScreened){
                shStore.fullScreened = true;
                fullScreen();
                return;
            }
            shStore.fullScreened = false;
            exitFullScreen();
        }
    });
    // not work for browser behavior "API can only be initiated by a user gesture."
    // $('#fullscreen').on('click', fullScreen);
    // $('#fullscreen').trigger('click');
});