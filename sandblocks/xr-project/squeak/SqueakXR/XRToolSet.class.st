Class {
	#name : #XRToolSet,
	#superclass : #Object,
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XRToolSet class >> debugException: anException [

	Transcript showln: '(exception handling nyi) An exception occurred: ', anException description
]

{ #category : #'as yet unclassified' }
XRToolSet class >> doWithDefaultErrorHandling: aBlock [

	^ aBlock
		on: CurrentReadOnlySourceFiles
		do: [:e | e pass]
		on: Error
		do: [:error | self handleError: error]
]

{ #category : #'as yet unclassified' }
XRToolSet class >> handleError: anError [
	
	Transcript show: (String new: 1000 streamContents: [:stream | | context |
		stream
			nextPutAll: '======== An error occurred (XRToolSet) ========';
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
			ensure: [JSObjectProxy continueHandlingCallback: XRWorld current animationLoop]].
	
	XRWorld current ifNotNil: [:world | world displayError: anError].
]
