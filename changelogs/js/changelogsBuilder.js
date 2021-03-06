var HTMLlogStart = "<div class='row'></div>"
var HTMLlogDateStart = "<div class='col-md-3 log-date'></div>";
var HTMLlogDate = "<p>%data%</p>";
var HTMLlogDescriptionStart = "<div class='col-md-9 log-description'></div>";
var HTMLlogDescription = "<p class='text-justify'>%data%</p>";


var changelogs = {
	"logs": [
		{
			"date": "December 19, 2014",
			"description": "createConference funtion was implemented to enable a user to create a conference. It tooks some time to test it, but it turned out that the client ID in google console was suddenly disappeared. So, i have to create it again. I also got this error: 'message: java.lang.IllegalArgumentException: No class 'com.google.devrel.training.conference.domain.Conference' was registered'. To solve it, the Conference class has to be registerd in objectify, so that it can be stored in Google Datastore."
		},
		{
			"date": "December 18, 2014",
			"description": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc."
		}
	]
};

changelogs.display = function(){
	for(var log in changelogs.logs){
		$("#changelogs").append(HTMLlogStart);

		$(".row:last").append(HTMLlogDateStart);
		var formattedDate = HTMLlogDate.replace("%data%", changelogs.logs[log].date);
		$(".log-date:last").append(formattedDate);

		$(".row:last").append(HTMLlogDescriptionStart);
		var formattedDescription = HTMLlogDescription.replace("%data%", changelogs.logs[log].description);
		$(".log-description:last").append(formattedDescription);
	}
}

changelogs.display();