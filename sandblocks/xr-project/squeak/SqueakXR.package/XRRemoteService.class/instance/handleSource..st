requests
handleSource: aWebRequest

	aWebRequest isGetRequest ifTrue: [self getSource: aWebRequest. ^ self].
	aWebRequest isPostRequest ifTrue: [self postSource: aWebRequest. ^ self].
	aWebRequest send405Response: false.