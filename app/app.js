import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Dimensions,
  Keyboard
} from 'react-native';

import Button from 'react-native-button';
import DeviceStorage from './utils/storage.js';
import _ from 'lodash';

const taskUrl = 'http://iems.shinetechchina.com.cn/MyIems/taskes/mytaskes.aspx';
const verifyApi = 'http://iems.shinetechchina.com.cn/User/Login?ReturnUrl=%2F';
const loginUrl = "http://iems.shinetechchina.com.cn";
const cheerio = require('cheerio-without-node-native');

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            userName: '',
            passWord: '',
            textlist: []
        };
        this.fillTime = this.fillTime.bind(this);
    }
    
    componentDidMount() {
        DeviceStorage.get("credential").then((credential)=>{
            if(credential) {
                this.setState({ userName: credential.userName,passWord:credential.passWord });
            }
        });
    }
        
    async fillTime() {
        Keyboard.dismiss();
        this.state.textlist = [];
        // this.setState(previousState => {
        //     return { textlist: [] };
        // });
        let userName = this.state.userName;
        let passWord = this.state.passWord;
        if (userName.length == 0 || passWord.length == 0) {
            this.showMessage('用户名,密码不能为空')
            return;
        }
        try{
            this.showMessage('正在登陆...');
            let response = await fetch(loginUrl, {
                method: 'GET'
            });
            if(response.status === 200)
            {
                let html = await response.text();
                let $ = cheerio.load(html);
                DeviceStorage.save("credential",{userName:this.state.userName,passWord:this.state.passWord});
                if($("#logoutForm a") && $("#logoutForm a").text() === "注销")
                {
                    this.showMessage('有cookie');
                    this.reportTime();
                }else{
                    this.showMessage('没cookie');
                    let loginToken = $("input[name='__RequestVerificationToken']").val();
                    let verifyData = {'Email':userName,'Password':passWord,'__RequestVerificationToken':loginToken};
                    let verifyFormData = Object.keys(verifyData).map(function(keyName) {
                        return encodeURIComponent(keyName) + '=' + encodeURIComponent(verifyData[keyName])
                    }).join('&');

                    let verifyResponse = await fetch(verifyApi, {
                            method:'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body:verifyFormData
                        }
                    );

                    if(verifyResponse.status === 200){
                        this.reportTime();
                    }
                }
            }
            else
            {
                this.showMessage('打开登陆网站失败');
            }
        }catch(error){
            Alert.alert(
                '',
                error.message,
                [
                    { text: 'OK', onPress: () => console.log('error') }
                ]
            )
        }
    }

    async reportTime() {
        this.showMessage('登陆成功，准备填入工作量...');
        let taskResponse = await fetch(taskUrl, {
            method: 'GET'
        });
        let taskHtml = await taskResponse.text();
        $ = cheerio.load(taskHtml);
        this.showMessage("标题是："+$("title").text());
        let reportTimeData = {};
        let inputs = $("form input");
        _.forEach(inputs, function (t) {
            let attrValue = t.attribs.value;
            if (t.attribs.name && t.attribs.name.indexOf('txtHours') > 0) {
                attrValue = 8
            }
            reportTimeData[t.attribs.name] = attrValue;
        });

        let reportTimeFormData = Object.keys(reportTimeData).map(function (keyName) {
            return encodeURIComponent(keyName) + '=' + encodeURIComponent(reportTimeData[keyName])
        }).join('&');

        let reportResponse = await fetch(taskUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: reportTimeFormData
        });
        let reportHtml = await reportResponse.text();
        $ = cheerio.load(reportHtml);
        let msg = $('#ContentPlaceHolderMain_rtPOs_lerrorMessage_0').text();
        Alert.alert(
            '',
            msg,
            [
                { text: 'OK', onPress: () => console.log('success') }
            ]
        )
    }

    showMessage(msg) {
        if (msg) {
            var count = this.state.textlist.length;
            let msgElement = (
                <Text style={styles.baseText} key={count + 1}> {msg} </Text>
            );

            let msgList = this.state.textlist.concat([msgElement]);
            this.setState({ textlist: msgList })
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.signin}>
                    Shinetech
                </Text>
                <TextInput style={styles.textbox} ref='userName' placeholder='用户名' onChangeText={(text) => this.setState({ userName: text }) } value={this.state.userName} />
                <TextInput secureTextEntry={true} style={styles.textbox} ref='passWord' placeholder='密码' onChangeText={(text) => this.setState({ passWord: text }) } value={this.state.passWord} />
                <Button
                    containerStyle={{ padding: 10, height: 45, overflow: 'hidden', borderRadius: 4, backgroundColor: '#569e3d', marginTop: 10 }}
                    style={{ fontSize: 20, color: 'white', width: 80 }}
                    styleDisabled={{ color: 'red' }}
                    onPress={this.fillTime}>
                    填 入
                </Button>
                <View style={{ marginTop: 15 }}>
                    {this.state.textlist}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    signin: {
        textAlign: 'center',
        fontSize: 30,
        color: 'gray',
        marginTop: 60
    },
    textbox: {
        fontSize: 16,
        height: 50,
        color: 'rgb(46,52,54)',
        width: Dimensions.get('window').width - 40
    },
    baseText: {
        fontFamily: 'Cochin',
        fontSize: 16,
        color: '#ff8800'
    },

});

export default App;