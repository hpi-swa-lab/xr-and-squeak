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
XRRemoteService class >> createWebXRImage [

	| resuming smalltalkName |
	smalltalkName := Smalltalk imageName.
	Smalltalk imageName: (FileDirectory default fullNameFor: 'websqueakxr.image') asSqueakPathName.
	resuming := Smalltalk forXrSnapshot: true andQuit: false withExitCode: nil embedded: false.
	resuming == true ifFalse: [Smalltalk imageName: smalltalkName.
		Smalltalk snapshot: true andQuit: false withExitCode: nil embedded: false.].
]

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

{ #category : #'as yet unclassified' }
XRRemoteService class >> syncCategories [
	
	^ #('SqueakXR*' 'JSBridge*' '3DTransform*')
]

{ #category : #sources }
XRRemoteService >> extensionMethodSourcesFor: aCollectionOfCategories [

	| sources |
	sources := Dictionary new.
	aCollectionOfCategories
		do: [:category |
			((SystemNavigation new allExtensionMethodsOfPackage: category)
				groupBy: #actualClass) associations
					do: [:classAndMethods | | categorySources |
						categorySources := classAndMethods value collect: [:method | {
							#selector -> (method methodSymbol).
							#source -> (method sourceString).
							} as: Dictionary].
						sources
							at: classAndMethods key name
							ifPresent: [:existingSources | existingSources addAll: categorySources]
							ifAbsentPut: [categorySources]]].
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
			#instanceMethods -> (cls selectors collect: [:selector | {
				#selector -> selector.
				#source -> (cls sourceCodeAt: selector)
				} as: Dictionary]).
			#classMethods -> (cls class selectors collect: [:selector | {
				#selector -> selector.
				#source -> (cls class sourceCodeAt: selector)
				} as: Dictionary])
		} as: Dictionary]
]

{ #category : #requests }
XRRemoteService >> postSource: aWebRequest [

	self notYetImplemented
]

{ #category : #sources }
XRRemoteService >> source [

	| allCategories rootCategories |
	allCategories := (self class syncCategories collect: [:cat |
		SystemOrganization categoriesMatching: cat])
		concatenation.
	rootCategories := self class syncCategories collect: [:c | c copyFrom: 1 to: c size - 1].
	
	^ {
		#packageSources -> (self packageSourcesFor: allCategories).
		#extensionMethods -> (self extensionMethodSourcesFor: rootCategories).
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
