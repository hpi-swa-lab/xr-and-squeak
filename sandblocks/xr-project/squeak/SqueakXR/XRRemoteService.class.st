Class {
	#name : #XRRemoteService,
	#superclass : #Object,
	#instVars : [
		'server'
	],
	#classVars : [
		'CurrentService'
	],
	#category : #'SqueakXR-Core'
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

{ #category : #sources }
XRRemoteService >> extensionMethodSourcesFor: aCollectionOfCategories [

	| sources |
	sources := Dictionary new.
	aCollectionOfCategories
		do: [:category |
			((SystemNavigation new allExtensionMethodsOfPackage: category)
				groupBy: #actualClass) associations
					do: [:classAndMethods |
						sources
							at: classAndMethods key name
							put: (classAndMethods value collect: #sourceString)]].
	^ sources
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

{ #category : #sources }
XRRemoteService >> packageSourcesFor: aCollectionOfCategories [

	| classes |
	classes := ChangeSet superclassOrder: (
		(aCollectionOfCategories collect: [:cat |
			SystemOrganization classesIn: cat])
		concatenation).
	
	^ classes collect: [:cls |
		{
			#name -> (cls name).
			#definition -> (cls definition).
			#instanceMethods -> (cls selectors collect: [:selector |
				cls sourceCodeAt: selector]).
			#classMethods -> (cls class selectors collect: [:selector |
				cls class sourceCodeAt: selector])
		} as: Dictionary]
]

{ #category : #requests }
XRRemoteService >> postSource: aWebRequest [

	self notYetImplemented
]

{ #category : #sources }
XRRemoteService >> source [

	| categories |
	categories := (#('SqueakXR*' 'JSBridge*') collect: [:cat |
		SystemOrganization categoriesMatching: cat])
		concatenation.
	
	^ {
		#packageSources -> (self packageSourcesFor: categories).
		#extensionMethods -> (self extensionMethodSourcesFor: categories).
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
