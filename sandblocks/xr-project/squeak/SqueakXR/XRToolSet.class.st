Class {
	#name : #XRToolSet,
	#superclass : #Object,
	#category : #SqueakXR
}

{ #category : #'as yet unclassified' }
XRToolSet class >> handleError: anError [
	
	Transcript show: (String new: 1000 streamContents: [:stream | | context |
		stream
			nextPutAll: '======== An error occurred ========';
			nextPut: Character cr;
			nextPutAll: anError asString;
			nextPut: Character cr;
			nextPutAll: 'Stack trace:';
			nextPut: Character cr.
		
		context := anError signalerContext.
		[context] whileNotNil: [
			stream
				nextPutAll: context asString;
				nextPut: Character cr.
			context := context sender]])
]
