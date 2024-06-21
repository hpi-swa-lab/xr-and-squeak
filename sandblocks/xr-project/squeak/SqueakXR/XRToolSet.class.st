Class {
	#name : #XRToolSet,
	#superclass : #Object,
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XRToolSet class >> doWithDefaultErrorHandling: aBlock [

	^ aBlock
		on: Exception
		do: [:exception | self handleError: exception]
]

{ #category : #'as yet unclassified' }
XRToolSet class >> handleError: anError [
	
	XRWorld current displayError: anError.
	
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
			context := context sender]]).
	
	XRWorld renderProcessIsActive ifTrue: [
		[Processor terminateActive]
			ensure: [JSObjectProxy continueHandlingCallback: XRWorld current animationLoop]]
]
