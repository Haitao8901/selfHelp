$(function () {
    loadTargetPage("welcome");
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
});