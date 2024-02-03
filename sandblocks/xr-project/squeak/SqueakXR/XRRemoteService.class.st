Class {
	#name : #XRRemoteService,
	#superclass : #Object,
	#instVars : [
		'server'
	],
	#classVars : [
		'CurrentService'
	],
	#category : #SqueakXR
}

{ #category : #'as yet unclassified' }
XRRemoteService class >> start [

	self stop.
	CurrentService := XRRemoteService new start
]

{ #category : #'as yet unclassified' }
XRRemoteService class >> stop [

	CurrentService ifNotNil: [
		CurrentService stop.
		CurrentService := nil]
]

{ #category : #requests }
XRRemoteService >> getSource: aWebRequest [

	aWebRequest
		send200Response: self source asJsonString
		contentType: 'application/json'
		do: [:res | res headerAt: 'Access-Control-Allow-Origin' put: '*']
]

{ #category : #requests }
XRRemoteService >> handleSource: aWebRequest [

	aWebRequest isGetRequest ifTrue: [self getSource: aWebRequest. ^ self].
	aWebRequest isPostRequest ifTrue: [self postSource: aWebRequest. ^ self].
	aWebRequest send405Response: false.
]

{ #category : #requests }
XRRemoteService >> postSource: aWebRequest [

	self notYetImplemented
]

{ #category : #'as yet unclassified' }
XRRemoteService >> source [

	| extensionMethods packageSources |
	
	packageSources := (SystemOrganization classesIn: 'SqueakXR') collect: [:cls |
		{
			#name -> (cls name).
			#definition -> (cls definition).
			#instanceMethods -> (cls selectors collect: [:selector |
				cls sourceCodeAt: selector]).
			#classMethods -> (cls class selectors collect: [:selector |
				cls class sourceCodeAt: selector])
		} as: Dictionary].
	
	extensionMethods := ((SystemNavigation new allExtensionMethodsOfPackage: 'SqueakXR')
		groupBy: #actualClass) associations
			collect: [:classAndMethods |
				(classAndMethods key name) -> (classAndMethods value collect: #sourceString)]
			as: Dictionary.
	
	^ {
		#packageSources -> packageSources.
		#extensionMethods -> extensionMethods.
	} as: Dictionary
]

{ #category : #'as yet unclassified' }
XRRemoteService >> start [

	server := WebServer new
		listenOn: 9824;
		addService: '/source' action: (MessageSend receiver: self selector: #handleSource:);
		errorHandler: [:err :request | ToolSet debugException: err]
]

{ #category : #'as yet unclassified' }
XRRemoteService >> stop [

	server listenerSocket close.
	server stopListener
]
