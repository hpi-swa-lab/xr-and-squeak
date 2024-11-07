Class {
	#name : #XRTestCase,
	#superclass : #TestCase,
	#instVars : [
		'actualJS'
	],
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRTestCase >> setUp [

	actualJS := Smalltalk at: #JS ifAbsent: nil.
	Smalltalk at: #JS put: (XRJSMock new)
]

{ #category : #'as yet unclassified' }
XRTestCase >> tearDown [

	Smalltalk at: #JS put: actualJS
]
